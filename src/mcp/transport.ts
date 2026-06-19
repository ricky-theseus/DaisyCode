import { spawn, type ChildProcess } from 'node:child_process';
import { createInterface, type Interface } from 'node:readline';
import type { JSONRPCRequest, JSONRPCResponse } from './types.js';

export class MCPServerTransport {
  private proc: ChildProcess | null = null;
  private rl: Interface | null = null;
  private messageCallback: ((msg: JSONRPCResponse) => void) | null = null;
  private closeCallback: ((code: number | null, signal: string | null) => void) | null = null;
  private errorCallback: ((err: Error) => void) | null = null;
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: JSONRPCResponse) => void; reject: (e: Error) => void; timer: NodeJS.Timeout }>();

  spawn(command: string, args: string[], env?: Record<string, string>, requestTimeout = 60_000): void {
    // Resource limits: Node.js MCP processes get --max-old-space-size=512
    const spawnEnv: Record<string, string> = { ...process.env as Record<string, string> };
    if (env) Object.assign(spawnEnv, env);

    // If the command is node/npx, set NODE_OPTIONS for memory limit
    const baseName = command.split(/[/\\]/).pop()?.toLowerCase() ?? '';
    if (baseName === 'node' || baseName === 'npx') {
      spawnEnv.NODE_OPTIONS = spawnEnv.NODE_OPTIONS
        ? `${spawnEnv.NODE_OPTIONS} --max-old-space-size=512`
        : '--max-old-space-size=512';
    }

    this.proc = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: spawnEnv,
      // ponytail: resourceLimits for non-Node processes; 512MB memory ceiling
      // TODO: make resource limits configurable per MCP server config
    });

    this.proc.on('error', (err) => {
      this.errorCallback?.(err);
    });

    this.proc.on('close', (code, signal) => {
      this.closeCallback?.(code, signal);
      this.proc = null;
      this.cleanup();
    });

    // Readline on stdout — one JSON-RPC message per line
    this.rl = createInterface({ input: this.proc.stdout! });
    this.rl.on('line', (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      let msg: JSONRPCResponse;
      try {
        msg = JSON.parse(trimmed) as JSONRPCResponse;
      } catch {
        // ponytail: invalid JSON from MCP server — skip line, don't crash
        // TODO: log to debug channel when we have one
        return;
      }

      if (msg.id !== undefined && msg.id !== null) {
        const pending = this.pending.get(msg.id as number);
        if (pending) {
          clearTimeout(pending.timer);
          this.pending.delete(msg.id as number);
          pending.resolve(msg);
        }
      }

      this.messageCallback?.(msg);
    });

    // Collect stderr for debugging (don't crash on stderr output)
    let stderrBuf = '';
    this.proc.stderr?.on('data', (data: Buffer) => {
      stderrBuf += data.toString();
    });
  }

  send(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    return new Promise((resolve, reject) => {
      if (!this.proc?.stdin?.writable) {
        reject(new Error('MCP transport not connected'));
        return;
      }

      const id = request.id ?? this.nextId++;
      const req = { ...request, id };

      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`MCP request timeout: ${req.method}`));
      }, 60_000); // ponytail: hardcoded 60s timeout, make configurable if needed

      this.pending.set(id, { resolve, reject, timer });

      try {
        this.proc.stdin.write(JSON.stringify(req) + '\n');
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  onMessage(callback: (msg: JSONRPCResponse) => void): void {
    this.messageCallback = callback;
  }

  onClose(callback: (code: number | null, signal: string | null) => void): void {
    this.closeCallback = callback;
  }

  onError(callback: (err: Error) => void): void {
    this.errorCallback = callback;
  }

  close(): void {
    this.rl?.close();
    this.rl = null;

    // Reject all pending requests
    for (const { reject, timer } of this.pending.values()) {
      clearTimeout(timer);
      reject(new Error('MCP transport closed'));
    }
    this.pending.clear();

    if (this.proc) {
      // Graceful kill: SIGTERM first, then SIGKILL after 3s
      const proc = this.proc;
      proc.kill('SIGTERM');
      setTimeout(() => {
        if (!proc.killed) {
          proc.kill('SIGKILL');
        }
      }, 3000).unref();
      // this.proc is set to null in the close event
    }
  }

  get pid(): number | undefined {
    return this.proc?.pid;
  }

  private cleanup(): void {
    this.rl?.close();
    this.rl = null;
    for (const { reject, timer } of this.pending.values()) {
      clearTimeout(timer);
      reject(new Error('MCP process exited'));
    }
    this.pending.clear();
  }
}
