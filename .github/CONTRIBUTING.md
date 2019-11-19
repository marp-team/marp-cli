# Contributing to Marp CLI

Thank you for taking the time to read how to contribute to Marp CLI! This is the guideline for contributing to Marp CLI.

But this document hardly has contents! We are following [**the contributing guideline of Marp team projects**](https://github.com/marp-team/.github/blob/master/CONTRIBUTING.md). _You have to read this before starting work._

## Development

```bash
# Build (Bundle and minify)
yarn build

# Watch (Bundle only)
yarn watch
```

### Run in Gitpod

You can also build and run `marp-cli` in Gitpod, an online IDE for GitHub:

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/marp-team/marp-cli)

### Use built version

Use `./marp-cli.js` instead of `marp` command.

```bash
./marp-cli.js --help
```

### Standalone binary

Standalone binaries created by [pkg](https://github.com/zeit/pkg) will output to `./bin` directory.

```bash
# Build & create standalone binaries
yarn build:standalone
```

```bash
./bin/marp-cli-linux --help
```
