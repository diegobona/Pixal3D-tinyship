import { spawn } from 'node:child_process'

const proxy = process.env.LOCAL_PROXY_URL || 'http://127.0.0.1:1080'

const env = {
  ...process.env,
  HTTP_PROXY: process.env.HTTP_PROXY || proxy,
  HTTPS_PROXY: process.env.HTTPS_PROXY || proxy,
  NO_PROXY: process.env.NO_PROXY || 'localhost,127.0.0.1,::1',
  NODE_OPTIONS: [process.env.NODE_OPTIONS, '--use-env-proxy'].filter(Boolean).join(' '),
}

console.log(`[dev:next:proxy] Using proxy: ${env.HTTPS_PROXY}`)
console.log('[dev:next:proxy] Starting Next app on http://localhost:7001')

const child = spawn(
  'corepack',
  ['pnpm', '--filter', '@tinyship/next-app', 'dev'],
  {
    env,
    shell: true,
    stdio: 'inherit',
  },
)

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})
