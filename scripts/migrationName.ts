import { readdir } from 'node:fs/promises';

export const migrationsFolder = new URL('../supabase/migrations/', import.meta.url);

// Named by today's date and the next free number for it, so it applies after every earlier one.
export async function nextMigrationName(suffix: string) {
  const today = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const taken = (await readdir(migrationsFolder)).filter(name => name.startsWith(today)).map(name => Number(name.slice(8, 12)));
  return `${today}${String(Math.max(0, ...taken) + 1).padStart(4, '0')}_${suffix}.sql`;
}
