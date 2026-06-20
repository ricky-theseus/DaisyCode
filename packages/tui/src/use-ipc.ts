import { spawn, ChildProcess } from 'node:child_process'

export interface KernelMessage {
  type: 'ready' | 'message' | 'status' | 'error' | 'exit'
  version?: string
  role?: 'user' | 'assistant' | 'system' | 'tool'
  content?: string
  done?: boolean
  agent?: string
  model?: string
  tokens?: number
  message?: string
  code?: number
}

export interface IpcState {
  connected: boolean
  version: string
  agent: string
  model: string
  tokens: number
  status: 'idle' | 'stream' | 'think' | 'error'
}

export function createIpcBridge(
  onMessage: (msg: KernelMessage) => void,
  onStateChange: (state: Partial<IpcState>) => void,
) {
  let kernel: ChildProcess | null = null
  let buffer = ''

  function start(kernelPath: string) {
    kernel = spawn(kernelPath, [], {
      stdio: ['pipe', 'pipe', 'inherit'],
    })

    kernel.stdout!.on('data', (chunk: Buffer) => {
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      // ponytail: buffer handles chunk boundaries — last element may be incomplete
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const msg: KernelMessage = JSON.parse(line)
          onMessage(msg)
          if (msg.type === 'ready') {
            onStateChange({ connected: true, version: msg.version || '' })
          } else if (msg.type === 'status') {
            onStateChange({
              agent: msg.agent || '',
              model: msg.model || '',
              tokens: msg.tokens || 0,
            })
          } else if (msg.type === 'error') {
            onStateChange({ status: 'error' })
          }
        } catch {
          // skip malformed lines
        }
      }
    })

    kernel.on('exit', () => {
      kernel = null
      onStateChange({ connected: false })
    })
  }

  function send(type: string, content?: string) {
    if (!kernel?.stdin?.writable) return
    const msg = { type, content }
    kernel.stdin.write(JSON.stringify(msg) + '\n')
  }

  function stop() {
    kernel?.kill()
    kernel = null
  }

  return { start, send, stop }
}
