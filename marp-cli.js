#!/usr/bin/env node

'use strict'
{
  const prepare = require('./lib/prepare.js')
  const cli = prepare.cliPrepare()

  if (cli.debug)
    process.env.DEBUG = `${process.env.DEBUG ? `${process.env.DEBUG},` : ''}${cli.debug}`

  require('./lib/patch.js').patch()
  require('./lib/marp-cli.js')
    .cliInterface(cli.args)
    .then((exitCode) => process.on('exit', () => process.exit(exitCode)))
}
