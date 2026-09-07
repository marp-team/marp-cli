#!/usr/bin/env node

import { cliPrepare } from './lib/prepare.mjs'

const cli = cliPrepare()

if (cli.debug)
  process.env.DEBUG = `${process.env.DEBUG ? `${process.env.DEBUG},` : ''}${cli.debug}`

const { patch } = await import('./lib/patch.mjs')
patch()

const { cliInterface } = await import('./lib/marp-cli.mjs')
const exitCode = await cliInterface(cli.args)
process.on('exit', () => process.exit(exitCode))
