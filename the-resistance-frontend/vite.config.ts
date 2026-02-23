import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  // Standalone frontend should read its own .env/.env.local.
  envDir: '.',
  define: {
    global: 'globalThis'
  },
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${path.resolve(__dirname, './src')}/` },
      { find: 'buffer', replacement: path.resolve(__dirname, './node_modules/buffer/') },
      { find: /^pino$/, replacement: path.resolve(__dirname, './src/shims/pino.ts') }
    ],
    dedupe: ['@stellar/stellar-sdk']
  },
  optimizeDeps: {
    include: ['@stellar/stellar-sdk', '@stellar/stellar-sdk/contract', '@stellar/stellar-sdk/rpc', 'buffer'],
    exclude: ['@noir-lang/noir_js', '@noir-lang/acvm_js', '@noir-lang/noirc_abi', '@aztec/bb.js'],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      },
      target: 'esnext'
    }
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true
    },
    target: 'esnext'
  },
  server: {
    port: 3000,
    open: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },
  worker: {
    format: 'es',
    plugins: () => []
  },
  assetsInclude: ['**/*.wasm']
})
