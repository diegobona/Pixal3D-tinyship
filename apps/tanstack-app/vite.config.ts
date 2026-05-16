import { config as dotenvConfig } from 'dotenv'
import path from 'node:path'

dotenvConfig({ path: path.resolve(__dirname, '../../.env') })

import { defineConfig, type PluginOption } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'

const isCfDeploy = !!process.env.CF_DEPLOY

async function getCfPlugin(): Promise<PluginOption[]> {
  if (!isCfDeploy) return []
  const { cloudflare } = await import('@cloudflare/vite-plugin')
  return [cloudflare({ viteEnvironment: { name: 'ssr' } })]
}

const cfPlugin = await getCfPlugin()

export default defineConfig({
  server: {
    port: 7001,
  },
  plugins: [
    ...cfPlugin,
    tailwindcss(),
    tsconfigPaths(),
    svgr({ svgrOptions: { icon: true }, include: '**/*.svg' }),
    tanstackStart(),
    viteReact(),
  ],
  ssr: {
    noExternal: ['streamdown', 'katex', 'rehype-katex'],
  },
})
