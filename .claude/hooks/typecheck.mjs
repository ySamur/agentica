// PostToolUse hook: type-check after Claude edits a TypeScript file.
// Exit code 2 sends the compiler output back to Claude so it fixes the errors.
import { spawnSync } from 'node:child_process';

let input = '';
for await (const chunk of process.stdin) input += chunk;

const { file_path: filePath } = JSON.parse(input).tool_input;
if (!/\.tsx?$/.test(filePath)) process.exit(0);

const result = spawnSync('npm run typecheck --silent', {
  cwd: process.env.CLAUDE_PROJECT_DIR,
  shell: true,
  encoding: 'utf8',
});

if (result.status !== 0) {
  process.stderr.write(`TypeScript errors after editing ${filePath}:\n${result.stdout}${result.stderr}`);
  process.exit(2);
}
