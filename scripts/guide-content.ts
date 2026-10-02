// npm run guide:content -- <step-id> …
// Writes a migration that publishes these lessons and their answer keys (content/guide/<step-id>.ts).
import { readdir, writeFile } from 'node:fs/promises';
import { lessons } from '../content/guide/index.ts';
import { compileLesson, contentMigration } from './guideContent.ts';

const ids = process.argv.slice(2);
if (!ids.length) {
  console.error('Usage: npm run guide:content -- <step-id> …');
  process.exit(1);
}
const compiled = ids.map(id => {
  const source = lessons.find(lesson => lesson.stepId === id);
  if (!source) throw new Error(`No lesson for ${id} in content/guide/index.ts`);
  return compileLesson(source);
});

// Named by today's date and the next free number for it, so it applies after every earlier one.
const folder = new URL('../supabase/migrations/', import.meta.url);
const today = new Date().toISOString().slice(0, 10).replaceAll('-', '');
const taken = (await readdir(folder)).filter(name => name.startsWith(today)).map(name => Number(name.slice(8, 12)));
const name = `${today}${String(Math.max(0, ...taken) + 1).padStart(4, '0')}_guide_content_${ids.join('_').replaceAll('-', '_')}.sql`;
await writeFile(new URL(name, folder), contentMigration(compiled));
console.log(`supabase/migrations/${name}`);
