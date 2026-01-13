#!/usr/bin/env node
const { spawn } = require('child_process')
const path = require('path')
const electron = require('electron')

const mainFile = path.join(__dirname, '../out/main/index.js')

const child = spawn(electron, [mainFile], {
  stdio: 'inherit',
  env: {
    ...process.env,
    ELECTRON_RENDERER_URL: 'http://127.0.0.1:5173',
  }
})

child.on('close', (code) => {
  process.exit(code)
})
