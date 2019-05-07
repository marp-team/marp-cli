# Contributing to Marp CLI

Thank you for taking the time to read how to contribute to Marp CLI! This is the guideline for contributing to Marp CLI.

But this document hardly has contents! We are following [the contributing guideline of marp-team projects](https://github.com/marp-team/marp/blob/master/.github/CONTRIBUTING.md). Please read these guidelines this before starting work in Marp CLI.

- [**Code of Conduct**](https://github.com/marp-team/marp/blob/master/.github/CODE_OF_CONDUCT.md)
- [**Report issue**](https://github.com/marp-team/marp/blob/master/.github/CONTRIBUTING.md#report-issue)
- [**Pull request**](https://github.com/marp-team/marp/blob/master/.github/CONTRIBUTING.md#pull-request)
- [**Release**](https://github.com/marp-team/marp/blob/master/.github/CONTRIBUTING.md#release)

## Development

```bash
# Build (Bundle and minify)
yarn build

# Watch (Bundle only)
yarn watch
```

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
