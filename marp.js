#!/usr/bin/env node

require('./lib/marp.js')
  .default()
  .then(exitCode => process.on('exit', () => process.exit(exitCode)))
