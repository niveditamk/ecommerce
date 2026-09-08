#!/usr/bin/env node
/* =============================================================
   START EVERYTHING
   Aurelis now needs three processes, and they have an order:
   PostgreSQL must be listening before Medusa will boot, and
   Medusa should be up before the admin tries to read from it.

   Starting them by hand in three terminals is how they end up
   half-running — and worse, `embedded-postgres` runs the database
   as a CHILD of a Node process, so anything that kills Node
   (a stray `taskkill /IM node.exe`, closing the wrong window)
   takes the database down with it and Medusa follows.

   This starts them in order, waits for each to actually answer
   rather than guessing with a sleep, and shuts the whole set
   down together on Ctrl+C.

     node scripts/dev.mjs           everything
     node scripts/dev.mjs --no-medusa   just the shop
   ============================================================= */
import { spawn } from 'node:child_process';
import path from 'node:path';
import net from 'node:net';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const withMedusa = !process.argv.includes('--no-medusa');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const node = process.execPath;

const children = [];
let shuttingDown = false;

const paint = (name, colour) => (line) => {
  line.toString().split('\n').filter((l) => l.trim()).forEach((l) => {
    process.stdout.write(`\x1b[${colour}m${name.padEnd(9)}\x1b[0m ${l}\n`);
  });
};

/* shell:true is needed on Windows for .cmd shims like npx, but it is
   wrong for an .exe: the command line is concatenated unquoted, so
   process.execPath — "C:\Program Files\nodejs\node.exe" — reaches cmd
   as three words and dies with "'C:\Program' is not recognized". Only
   the shims get a shell. */
function run(name, colour, cmd, args, cwd, env = {}, useShell = false) {
  const child = spawn(cmd, args, {
    cwd, shell: useShell,
    env: { ...process.env, ...env }
  });
  child.stdout.on('data', paint(name, colour));
  child.stderr.on('data', paint(name, colour));
  child.on('exit', (code) => {
    if (shuttingDown) return;
    paint(name, colour)(`exited with code ${code} — stopping everything else`);
    stop(1);
  });
  children.push(child);
  return child;
}

/** Wait for a port to actually accept a connection. A fixed sleep is a
    guess; this is the fact. */
function waitForPort(port, label, timeoutMs = 120000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const sock = net.connect({ port, host: '127.0.0.1' });
      sock.once('connect', () => { sock.destroy(); resolve(); });
      sock.once('error', () => {
        sock.destroy();
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`${label} did not come up on ${port} within ${timeoutMs / 1000}s`));
          return;
        }
        setTimeout(attempt, 700);
      });
    };
    attempt();
  });
}

function stop(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  process.stdout.write('\nstopping…\n');
  for (const c of children) {
    try {
      if (process.platform === 'win32') spawn('taskkill', ['/pid', String(c.pid), '/f', '/t']);
      else c.kill('SIGTERM');
    } catch { /* already gone */ }
  }
  setTimeout(() => process.exit(code), 1500);
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

/* ---------------------------------------------------------------- */
const serverEnv = path.join(ROOT, 'server', '.env');
if (!fs.existsSync(serverEnv)) {
  console.log('\x1b[33mNo server/.env — copy .env.example and fill it in, or the admin cannot reach Medusa or OpenRouter.\x1b[0m');
}

if (withMedusa) {
  run('postgres', '36', node, ['scripts/pg.mjs', 'start'], path.join(ROOT, 'medusa'));
  await waitForPort(5433, 'PostgreSQL');
  process.stdout.write('\x1b[36mpostgres \x1b[0m ready on 5433\n');

  run('medusa', '35', npx, ['medusa', 'develop'], path.join(ROOT, 'medusa'), {}, process.platform === 'win32');
  /* Medusa's first boot compiles; give it room. */
  await waitForPort(9000, 'Medusa', 180000);
  process.stdout.write('\x1b[35mmedusa   \x1b[0m ready on 9000\n');
}

run('aurelis', '33', node, ['--env-file-if-exists=.env', 'src/index.js'], path.join(ROOT, 'server'));
await waitForPort(4000, 'Aurelis');

process.stdout.write('\n');
process.stdout.write('  \x1b[1mstorefront\x1b[0m   http://localhost:4000\n');
process.stdout.write('  \x1b[1madmin\x1b[0m        http://localhost:4000/admin\n');
if (withMedusa) {
  process.stdout.write('  \x1b[1mmedusa admin\x1b[0m http://localhost:9000/app\n');
}
process.stdout.write('\n  Ctrl+C stops all of them together.\n\n');
