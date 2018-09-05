# @marp-team/marp-cli

[![CircleCI](https://img.shields.io/circleci/project/github/marp-team/marp-cli/master.svg?style=flat-square)](https://circleci.com/gh/marp-team/marp-cli/)
[![Codecov](https://img.shields.io/codecov/c/github/marp-team/marp-cli/master.svg?style=flat-square)](https://codecov.io/gh/marp-team/marp-cli)
[![npm](https://img.shields.io/npm/v/@marp-team/marp-cli.svg?style=flat-square)](https://www.npmjs.com/package/@marp-team/marp-cli)
[![LICENSE](https://img.shields.io/github/license/marp-team/marp-cli.svg?style=flat-square)](./LICENSE)

**A CLI interface, for [Marp](https://github.com/marp-team/marp)** (using [@marp-team/marp-core](https://github.com/marp-team/marp-core)) and any slide deck converter based on [Marpit](https://github.com/marp-team/marpit) framework.

It can convert Marp / Marpit Markdown files into static HTML (and CSS).

### :warning: _marp-cli is under construction and not ready to use stable._

## Try it now!

[npx](https://blog.npmjs.org/post/162869356040/introducing-npx-an-npm-package-runner) is the best tool when you want to convert Markdown right now. Just run below if you are installed [Node.js](https://nodejs.org/) >= 8.2.0:

```bash
# Convert slide deck into HTML
npx @marp-team/marp-cli slide-deck.md
npx @marp-team/marp-cli slide-deck.md -o output.html

# Convert slide deck into PDF
npx @marp-team/marp-cli slide-deck.md --pdf
npx @marp-team/marp-cli slide-deck.md -o output.pdf
```

> :information_source: You have to install [Google Chrome](https://www.google.com/chrome/) (or [Chromium](https://www.chromium.org/)) to convert slide deck into PDF.

## Install

### Global install

You can install CLI interface globally if you want to use `marp` command.

```bash
npm install -g @marp-team/marp-cli
```

Usage:

```bash
marp slide-deck.md -o output.html
```

### Local install

```
npm install --save-dev @marp-team/marp-cli
```

## Usage

Under construction.

## ToDo

- [x] Add `marp` bin
- [x] Convert to plain HTML (includes style)
- [ ] Import external theme file(s)
- [x] Select theme by option
- [x] Support configuration file (like `.marprc`)
- [ ] Watch mode
- [ ] Server mode
- [x] HTML templates
  - [x] Template that has ready to actual presentation powered by [Bespoke](https://github.com/bespokejs/bespoke)
- [x] Select engine to use any Marpit based module
- [x] Export PDF directly by using [Puppeteer](https://github.com/GoogleChrome/puppeteer)

## Author

Managed by [@marp-team](https://github.com/marp-team).

- <img src="https://github.com/yhatt.png" width="16" height="16"/> Yuki Hattori ([@yhatt](https://github.com/yhatt))

## License

[MIT License](LICENSE)
