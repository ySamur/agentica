// npm run guide:content -- <step-id> …
// Writes a migration that publishes these lessons and their answer keys (content/guide/<step-id>.ts).
import { writeFile } from 'node:fs/promises';
import { lessons } from '../content/guide/index.ts';
import { compileLesson, contentMigration } from './guideContent.ts';
import { migrationsFolder, nextMigrationName } from './migrationName.ts';

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

const name = await nextMigrationName(`guide_content_${ids.join('_').replaceAll('-', '_')}`);
await writeFile(new URL(name, migrationsFolder), contentMigration(compiled));
console.log(`supabase/migrations/${name}`);
