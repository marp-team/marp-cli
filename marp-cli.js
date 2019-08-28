#!/usr/bin/env node

'use strict'

require('v8-compile-cache')
require('./lib/marp-cli.js')
  .default(process.argv.slice(2))
  .then(exitCode => process.on('exit', () => process.exit(exitCode)))
