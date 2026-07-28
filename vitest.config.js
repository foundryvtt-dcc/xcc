import { defineConfig } from 'vitest/config'
import fs from 'node:fs'
import path from 'node:path'

// The module imports the DCC system via Foundry's absolute /systems/dcc/
// paths. Resolve those against a local DCC checkout: DCC_PATH env var if
// set, otherwise the sibling install in the Foundry data directory.
const dccPath = process.env.DCC_PATH || path.resolve(import.meta.dirname, '../../systems/dcc')
if (!fs.existsSync(path.join(dccPath, 'module'))) {
  throw new Error(`DCC system not found at ${dccPath} — set DCC_PATH to a dcc checkout`)
}

export default defineConfig({
  resolve: {
    alias: {
      '/systems/dcc': dccPath
    }
  },
  test: {
    include: ['module/__tests__/**/*.test.js'],
    exclude: ['**/node_modules/**']
  }
})
