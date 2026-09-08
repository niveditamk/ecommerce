/* Project-local PostgreSQL for Medusa.

   The machine has no PostgreSQL and no Docker, and installing either
   system-wide is a heavier change than a demo warrants. embedded-postgres
   downloads an official Postgres binary into node_modules and runs it on
   a private port, so the whole database lives inside the checkout and
   disappears with it.

   Usage:  node scripts/pg.mjs start | stop | status
*/
import EmbeddedPostgres from 'embedded-postgres';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, '..', '.pgdata');
const PORT = 5433;

const pg = new EmbeddedPostgres({
  databaseDir: DATA,
  user: 'medusa',
  password: 'medusa',
  port: PORT,
  persistent: true
});

const cmd = process.argv[2] || 'start';

if (cmd === 'start') {
  if (!fs.existsSync(DATA)) {
    console.log('initialising a fresh cluster…');
    await pg.initialise();
  }
  await pg.start();
  try {
    await pg.createDatabase('medusa');
    console.log('created database "medusa"');
  } catch {
    console.log('database "medusa" already present');
  }
  console.log(`PostgreSQL listening on 127.0.0.1:${PORT}`);
  console.log('leave this process running; Ctrl+C stops the server');
  /* Hold the process open so the server stays up. */
  process.stdin.resume();
  const bye = async () => { await pg.stop(); process.exit(0); };
  process.on('SIGINT', bye);
  process.on('SIGTERM', bye);
} else if (cmd === 'stop') {
  await pg.stop();
  console.log('stopped');
} else {
  console.log('usage: node scripts/pg.mjs start|stop');
}
