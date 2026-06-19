import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as readline from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve));
}

export async function initProject(cwd: string): Promise<void> {
  const rl = readline.createInterface({ input, output });

  console.log('DaisyCode — Project Initialization\n');

  const projectName = await ask(rl, `Project name (${basenameFallback(cwd)}): `);
  const name = projectName.trim() || basenameFallback(cwd);

  const defaultAgent = await ask(rl, 'Default agent name (default): ');
  const agent = defaultAgent.trim() || 'default';

  const model = await ask(rl, 'Default model (deepseek/deepseek-chat): ');
  const modelName = model.trim() || 'deepseek/deepseek-chat';

  rl.close();

  // Create daisy.jsonc
  const daisyPath = join(cwd, 'daisy.jsonc');
  if (existsSync(daisyPath)) {
    console.log('\ndaisy.jsonc already exists — skipping config creation.');
  } else {
    const config = {
      default_agent: agent,
      model: modelName,
      agent: {
        [agent]: {
          description: `Agent "${agent}" for project "${name}"`,
          permission: {
            read: 'allow',
            edit: 'ask',
            glob: 'allow',
            grep: 'allow',
            bash: 'ask',
          },
        },
      },
    };
    writeFileSync(daisyPath, `${JSON.stringify(config, null, 2)  }\n`, 'utf-8');
    console.log(`  Created daisy.jsonc`);
  }

  // Create .daisy/sessions/
  const sessionsDir = join(cwd, '.daisy', 'sessions');
  if (!existsSync(sessionsDir)) {
    mkdirSync(sessionsDir, { recursive: true });
    console.log(`  Created .daisy/sessions/`);
  }

  // Create .gitignore
  const gitignorePath = join(cwd, '.gitignore');
  if (existsSync(gitignorePath)) {
    console.log('  .gitignore already exists — skipping.');
  } else {
    const gitignore = `.daisy/sessions/
dist/
node_modules/
*.log
.tmp
`;
    writeFileSync(gitignorePath, gitignore, 'utf-8');
    console.log(`  Created .gitignore`);
  }

  console.log(`\nDaisyCode project "${name}" initialized.`);
}

function basenameFallback(p: string): string {
  const parts = p.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || 'my-project';
}
