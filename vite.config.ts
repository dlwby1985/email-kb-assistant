import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'

const projectRoot = __dirname

const buildDate = new Date().toISOString().split('T')[0]

export default defineConfig({
  root: path.join(projectRoot, 'src/renderer'),
  define: {
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
  plugins: [
    react(),
    electron([
      {
        entry: path.join(projectRoot, 'src/main/index.ts'),
        vite: {
          build: {
            outDir: path.join(projectRoot, 'dist-electron/main'),
            sourcemap: false,
            rollupOptions: {
              external: ['electron', 'better-sqlite3',
                'gray-matter', 'js-yaml', '@anthropic-ai/sdk', 'pdf-parse', 'mammoth', 'imapflow',
                'google-auth-library', 'dotenv', 'mailparser'],
            },
          },
        },
      },
      {
        entry: path.join(projectRoot, 'src/preload/index.ts'),
        onstart(args) {
          args.reload()
        },
        vite: {
          build: {
            outDir: path.join(projectRoot, 'dist-electron/preload'),
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  build: {
    outDir: path.join(projectRoot, 'dist'),
    emptyOutDir: true,
    sourcemap: false,
  },
})
