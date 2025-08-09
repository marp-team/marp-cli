# Contributing to Marp CLI

Thank you for taking the time to read how to contribute to Marp CLI! This is the guideline for contributing to Marp CLI.

We are following [**the contributing guideline of Marp team projects**][team-contributing-guideline]. _You have to read this before starting work._

[team-contributing-guideline]: https://github.com/marp-team/.github/blob/master/CONTRIBUTING.md

## Table of contents

- [Marp team contributing guideline ↗️][team-contributing-guideline]
- [Development](#development)
  - [Installation](#installation)
  - [Build and watch](#build-and-watch)
  - [Use built version](#use-built-version)
  - [Testing](#testing)
- [Debug](#debug)

## Development

### Installation

```bash
npm install
```

### Build and watch

```bash
# Build (Bundle and minify)
npm run build

# Watch (Bundle only)
npm run watch
```

### Use built version

Use `./marp-cli.js` instead of `marp` command.

```bash
./marp-cli.js --help
```

#### Standalone binary

Standalone binaries created by [pkg](https://github.com/zeit/pkg) will output to `./bin` directory.

```bash
# Build & create standalone binaries
npm run build:standalone
```

```bash
./bin/marp-cli-linux --help
```

### Testing

```bash
# Run all tests
npm run test

# Run tests with code coverage
npm run test:coverage

# Run test for specific file(s)
npm run test -- ./test/marp-cli.ts
```

You need to install [Google Chrome](https://www.google.com/chrome/), [Mozilla Firefox](https://www.mozilla.org/firefox/), and [LibreOffice](https://www.libreoffice.org/download/download-libreoffice/) for running all tests.

## Debug

If you have any trouble with Marp CLI, `--debug` (`-d`) option will help you to find the cause of the problem.

### Enable debug logging

```bash
marp --debug=true slide.md
```

### Filter debug log by namespace

```bash
# Show debug log about marp-cli:browser, except marp-cli:browser:finder
marp --debug "marp-cli:browser*,-marp-cli:browser:finder" slide.md
```

You can use `DEBUG` environment variable to enable debug log filter too: `DEBUG="marp-cli:browser*,-marp-cli:browser:finder"`

### Full debug log including dependencies

```bash
marp --debug=all slide.md
```

It is equivalent to `DEBUG="*" marp slide.md`.

> [!NOTE]
>
> `--debug` (`-d`) option is available only for CLI interface. If you are using API, you have to use `DEBUG` environment variable instead.
