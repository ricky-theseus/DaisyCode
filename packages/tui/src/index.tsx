#!/usr/bin/env node
import { render } from 'ink'
import App from './App.js'

const { waitUntilExit } = render(<App />)

waitUntilExit().catch(() => {
  process.exit(0)
})
