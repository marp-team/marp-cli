#!/usr/bin/env node

'use strict'

const SegfaultHandler = require('segfault-handler')
SegfaultHandler.registerHandler('crash.log')

require('v8-compile-cache')
require('./lib/marp-cli.js')
  .cliInterface(process.argv.slice(2))
  .then((exitCode) => process.on('exit', () => process.exit(exitCode)))
