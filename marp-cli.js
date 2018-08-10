#!/usr/bin/env node

require('./lib/marp-cli.js')
  .default()
  .then(exitCode => process.on('exit', () => process.exit(exitCode)))
