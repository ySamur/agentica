// npm run library:content
// Writes a migration that makes the published library match content/library/ (every material at once).
import { writeFile } from 'node:fs/promises';
import { library } from '../content/library/index.ts';
import { compileLibrary, libraryMigration } from './libraryContent.ts';
import { migrationsFolder, nextMigrationName } from './migrationName.ts';

const name = await nextMigrationName('library_content');
await writeFile(new URL(name, migrationsFolder), libraryMigration(compileLibrary(library)));
console.log(`supabase/migrations/${name}`);
