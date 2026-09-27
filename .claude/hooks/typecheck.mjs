// PostToolUse hook: type-check after Claude edits a TypeScript file.
// Exit code 2 sends the compiler output back to Claude so it fixes the errors.
import { spawnSync } from 'node:child_process';

let input = '';
for await (const chunk of process.stdin) input += chunk;

let filePath = '';
try {
  const payload = JSON.parse(input || '{}');
  filePath = payload.tool_input?.file_path || payload.tool_response?.filePath || '';
} catch {
  process.exit(0);
}

if (!/\.(ts|tsx|mts|cts)$/.test(filePath)) process.exit(0);

const result = spawnSync('npm run typecheck --silent', {
  cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd(),
  shell: true,
  encoding: 'utf8',
});

if (result.status !== 0) {
  process.stderr.write(`TypeScript errors after editing ${filePath}:\n${result.stdout}${result.stderr}`);
  process.exit(2);
}
