// Local demo mode: real database logic (PGlite) with a seeded sample family, no Docker or cloud project.
// Data lives in memory and is reset every time the demo starts.
import { spawn } from 'node:child_process';

const env = {
  ...process.env,
  VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_local_demo',
  VITE_BASE_PATH: '/',
  VITE_DEMO_MODE: 'true',
};
const run = (cmd, args) => spawn(cmd, args, { stdio: 'inherit', env, shell: process.platform === 'win32' });
const stack = run('npx', ['tsx', 'scripts/qa-stack/server.ts']);
const web = run('npx', ['vite', '--port', '5173']);
console.log(`
  Home Heroes — LOCAL DEMO MODE
  Parents:  father@example.com / password123   (or mother@example.com)
  Children: family code printed above, usernames tuqa | retal | hatem | obai, secret "<username>-star-7"
  Open http://localhost:5173
`);
const stop = () => { stack.kill(); web.kill(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
