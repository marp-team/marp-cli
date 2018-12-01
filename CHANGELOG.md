# Change Log

## [Unreleased]

### Added

- Support functional engine [#42](https://github.com/marp-team/marp-cli/pull/42)

## v0.0.14 - 2018-11-24

### Security

- Get rid of a malicious package `flatmap-stream` from deep dependency ([#40](https://github.com/marp-team/marp-cli/pull/40))

### Added

- Serve directory index and default markdown `index.md` or `PITCHME.md` in server mode ([#38](https://github.com/marp-team/marp-cli/pull/38))

### Fixed

- Use `Buffer.from()` instead of deprecated constructor ([#37](https://github.com/marp-team/marp-cli/pull/37))
- Remove `@ts-ignore` magic comment from test ([#39](https://github.com/marp-team/marp-cli/pull/39))
- Better lint and format while running CI ([#41](https://github.com/marp-team/marp-cli/pull/41))

### Changed

- Upgrade dependent packages to latest version ([#40](https://github.com/marp-team/marp-cli/pull/40))

## v0.0.13 - 2018-11-10

### Added

- Support Node 10 ([#35](https://github.com/marp-team/marp-cli/pull/35))

### Removed

- Remove `defer` attribute from inline `<script>` tag ([#34](https://github.com/marp-team/marp-cli/pull/34))

### Changed

- Use `util.promisify` to wrap callback-based funcs ([#32](https://github.com/marp-team/marp-cli/pull/32))
- Enable `--enable-blink-gen-property-trees` chromium flag to prevent incorrect rendering while PDF conversion ([#33](https://github.com/marp-team/marp-cli/pull/33))
- Upgrade dependent packages to latest version ([#36](https://github.com/marp-team/marp-cli/pull/36))

## v0.0.12 - 2018-10-09

### Fixed

- Upgrade marp-core to [v0.0.11](https://github.com/marp-team/marp-core/releases/tag/v0.0.11) to fix fitting header regression ([#30](https://github.com/marp-team/marp-cli/pull/30))

### Changed

- Update license author to marp-team ([#31](https://github.com/marp-team/marp-cli/pull/31))

## v0.0.11 - 2018-10-06

### Added

- Add server mode provided by `--server` (`-s`) option ([#27](https://github.com/marp-team/marp-cli/pull/27))
- Add fonts for internationalization to Docker image ([#26](https://github.com/marp-team/marp-cli/pull/26))

### Changed

- Recognize theme CSS in input directory specified by `--input-dir` (`-I`) option ([#28](https://github.com/marp-team/marp-cli/pull/28))
- Upgrade dependent packages to latest version, includes [Marpit v0.1.3](https://github.com/marp-team/marpit/releases/tag/v0.1.3) and [marp-team/marp-core v0.0.10](https://github.com/marp-team/marp-core/releases/tag/v0.0.10) ([#29](https://github.com/marp-team/marp-cli/pull/29))

## v0.0.10 - 2018-09-20

### Added

- Add `--theme-set` option to use additional theme CSS files ([#21](https://github.com/marp-team/marp-cli/pull/21))
- Support auto reloading of additional theme CSS in watch mode ([#22](https://github.com/marp-team/marp-cli/pull/22))
- Override theme by file path of theme CSS in `--theme` option ([#23](https://github.com/marp-team/marp-cli/pull/23), [#24](https://github.com/marp-team/marp-cli/pull/24))

### Changed

- Upgrade [Marpit v0.1.2](https://github.com/marp-team/marpit/releases/tag/v0.1.2) and [marp-team/marp-core v0.0.9](https://github.com/marp-team/marp-core/releases/tag/v0.0.9) ([#25](https://github.com/marp-team/marp-cli/pull/25))
- Upgrade dependent packages to latest version with many update of settings ([#25](https://github.com/marp-team/marp-cli/pull/25))

## v0.0.9 - 2018-09-18

### Added

- Add `--watch` (`-w`) option to support watch mode ([#18](https://github.com/marp-team/marp-cli/pull/18))
- Support HTML auto reloading on watch mode ([#20](https://github.com/marp-team/marp-cli/pull/20))

### Fixed

- Use singleton Chrome instance to convert into PDF ([#19](https://github.com/marp-team/marp-cli/pull/19))

## v0.0.8 - 2018-09-15

### Added

- Add official Docker image ([#14](https://github.com/marp-team/marp-cli/pull/14))
- Add `--input-dir` (`-I`) option to keep directory structure ([#16](https://github.com/marp-team/marp-cli/pull/16))

### Changed

- Upgrade Node LTS and depenent packages ([#17](https://github.com/marp-team/marp-cli/pull/17))

### Fixed

- Fix incorrect SVG scaling on Chrome ([#15](https://github.com/marp-team/marp-cli/pull/15))

## v0.0.7 - 2018-09-06

### Changed

- Use user-installed marp-core by default ([#12](https://github.com/marp-team/marp-cli/pull/12))

### Fixed

- Fix over-sanitized header and footer by upgrading [@marp-team/marp-core to v0.0.6](https://github.com/marp-team/marp-core/pull/29) ([#13](https://github.com/marp-team/marp-cli/pull/13))

## v0.0.6 - 2018-09-05

### Added

- Add `--html` option ([#7](https://github.com/marp-team/marp-cli/pull/7))
- Support configuration file (`.marprc` / `marp.config.js`) ([#9](https://github.com/marp-team/marp-cli/pull/9))
- Come back `--engine` option that can specify Marpit based module ([#9](https://github.com/marp-team/marp-cli/pull/9))
- Render local resources in converting PDF by `--allow-local-files` option ([#10](https://github.com/marp-team/marp-cli/pull/10))

### Changed

- Upgrade dependent package versions to latest ([#8](https://github.com/marp-team/marp-cli/pull/8), [#11](https://github.com/marp-team/marp-cli/pull/11))
- Create directories for the output path recursively ([#9](https://github.com/marp-team/marp-cli/pull/9))

## v0.0.5 - 2018-08-29

### Added

- Support conversion from standard input ([#4](https://github.com/marp-team/marp-cli/pull/4))
- Add `bespoke` HTML template for ready to presentation ([#5](https://github.com/marp-team/marp-cli/pull/5))

### Changed

- Update [@marp-team/marp-core](https://github.com/marp-team/marp-core) to [v0.0.4](https://github.com/marp-team/marp-core/releases/tag/v0.0.4) ([#6](https://github.com/marp-team/marp-cli/pull/6))

### Fixed

- Fix incorrect CJK fonts in exported PDF ([#3](https://github.com/marp-team/marp-cli/pull/3))

## v0.0.4 - 2018-08-23

### Added

- Convert slide deck into PDF with Puppeteer ([#2](https://github.com/marp-team/marp-cli/pull/2))

## v0.0.3 - 2018-08-22

### Added

- Support Marp core's fitting header by including browser bundle to exported PDF ([#1](https://github.com/marp-team/marp-cli/pull/1))
- Add tests to fill global minimum coverage

### Removed

- Make a sweep much advanced CLI options: `--engine`, `--engine-name`.\
  _These options will become to be configurable by JavaScript conf file in future._

## v0.0.2 - 2018-08-21

- Initial release. _Please notice that it is early alpha release._
