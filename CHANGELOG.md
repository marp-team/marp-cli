# Change Log

## [Unreleased]

### Breaking

- End-of-Lifed Node.js 16 is no longer supported, and required Node.js 18 and later ([#591](https://github.com/marp-team/marp-cli/pull/591))
- Upgrade Marp Core to [v4.0.0](https://github.com/marp-team/marp-core/releases/v4.0.0) ([#591](https://github.com/marp-team/marp-cli/pull/591))
  - The slide container of built-in themes became the block element and adopted safe centering
  - Relax HTML allowlist: Allowed a lot of HTML elements and attributes by default

### Added

- CI testing against Node.js v22 ([#591](https://github.com/marp-team/marp-cli/pull/591))

### Changed

- Upgrade Marpit to [v3.1.1](https://github.com/marp-team/marpit/releases/tag/v3.1.1) ([#591](https://github.com/marp-team/marp-cli/pull/591))
  - Support for CSS nesting
- Upgrade development Node.js LTS to v20.17.0 ([#591](https://github.com/marp-team/marp-cli/pull/591))
- Upgrade dependent packages to the latest versions ([#591](https://github.com/marp-team/marp-cli/pull/591))

### Fixed

- The browser sometimes cannot launch due to profile's singleton lock ([#589](https://github.com/marp-team/marp-cli/issues/589), [#591](https://github.com/marp-team/marp-cli/pull/591))
- Make silence some deprecation warnings in Node.js v22 ([#574](https://github.com/marp-team/marp-cli/issues/574), [#576](https://github.com/marp-team/marp-cli/issues/576), [#591](https://github.com/marp-team/marp-cli/pull/591))

## v3.4.0 - 2023-10-28

### Changed

- Upgrade Marpit to [v2.6.1](https://github.com/marp-team/marpit/releases/tag/v2.6.1) ([#557](https://github.com/marp-team/marp-cli/pull/557))
  - Added `lang` global directive
- Upgrade Marp Core to [v3.9.0](https://github.com/marp-team/marp-core/releases/v3.9.0) ([#557](https://github.com/marp-team/marp-cli/pull/557))
  - Enabled [CSS container query](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_container_queries) support for child elements of `section` element by default
- Upgrade dependent packages to the latest versions ([#557](https://github.com/marp-team/marp-cli/pull/557))
- Reflect the language defined in `lang` global directive to `<html>` element ([#542](https://github.com/marp-team/marp-cli/issues/542), [#558](https://github.com/marp-team/marp-cli/pull/558))

### Added

- CI testing against Node.js v20 ([#559](https://github.com/marp-team/marp-cli/pull/559))

### Fixed

- Enable PNG image transparency ([#555](https://github.com/marp-team/marp-cli/issues/555), [#556](https://github.com/marp-team/marp-cli/pull/556))

## v3.3.1 - 2023-10-01

### Fixed

- Improve stability of in-memory preview for large content ([#553](https://github.com/marp-team/marp-cli/pull/553))
- Accessibility: Render CLI's kind output in a specific color instead of ANSI color ([#552](https://github.com/marp-team/marp-cli/issues/552), [#554](https://github.com/marp-team/marp-cli/pull/554))

## v3.3.0 - 2023-09-23

### Added

- Support the project configuration file written in TypeScript `marp.config.ts` ([#548](https://github.com/marp-team/marp-cli/pull/548), [#549](https://github.com/marp-team/marp-cli/pull/549))
- `defineConfig` helper for writing typed configuration ([#549](https://github.com/marp-team/marp-cli/pull/549))
- Recognize `CHROME_NO_SANDBOX` env to allow opt-out of the Chrome/Chromium sandbox during conversion explicitly ([#543](https://github.com/marp-team/marp-cli/issues/543), [#550](https://github.com/marp-team/marp-cli/pull/550))

### Changed

- Upgrade Marpit to [v2.5.3](https://github.com/marp-team/marpit/releases/tag/v2.5.3) ([#548](https://github.com/marp-team/marp-cli/pull/548))
- Upgrade Marp Core to [v3.8.1](https://github.com/marp-team/marp-core/releases/v3.8.1) ([#548](https://github.com/marp-team/marp-cli/pull/548))
- Upgrade development Node.js LTS to v18.18.0 ([#547](https://github.com/marp-team/marp-cli/pull/547))
- Upgrade dependent packages to the latest versions ([#548](https://github.com/marp-team/marp-cli/pull/548))

### Fixed

- A huge document fails generating PDF/PPTX/images by `net::ERR_ABORTED` ([#545](https://github.com/marp-team/marp-cli/issues/545), [#551](https://github.com/marp-team/marp-cli/pull/551))

## v3.2.1 - 2023-08-24

### Added

- Allow async `render()` in the custom engine ([#540](https://github.com/marp-team/marp-cli/pull/540) by [@GuillaumeDesforges](https://github.com/GuillaumeDesforges))

### Changed

- Replace `is-docker` to `is-inside-container` for detecting more virtualized containers ([#543](https://github.com/marp-team/marp-cli/issues/543), [#544](https://github.com/marp-team/marp-cli/pull/544))

## v3.2.0 - 2023-08-04

### Changed

- Upgrade Marp Core to [v3.8.0](https://github.com/marp-team/marp-core/releases/v3.8.0) ([#536](https://github.com/marp-team/marp-cli/pull/536))
  - This core is no longer depending on the global `highlight.js` instance, in favor of the instance-specific highlight.js that is accessible through `highlightjs` getter
- Upgrade Node.js LTS ([#536](https://github.com/marp-team/marp-cli/pull/536))
- Upgrade dependent packages to the latest versions ([#535](https://github.com/marp-team/marp-cli/pull/535), [#536](https://github.com/marp-team/marp-cli/pull/536), [#537](https://github.com/marp-team/marp-cli/pull/537))

## v3.1.0 - 2023-07-09

### Added

- ES Modules support for the configuration file ([#534](https://github.com/marp-team/marp-cli/pull/534))
- `Config` type definition ([#534](https://github.com/marp-team/marp-cli/pull/534))

### Changed

- Upgrade dependent packages to the latest versions ([#533](https://github.com/marp-team/marp-cli/pull/533))
- Route help messages to stdout instead of stderr ([#532](https://github.com/marp-team/marp-cli/pull/532) by [@tomotargz](https://github.com/tomotargz))

## v3.0.2 - 2023-06-19

### Fixed

- Fix TypeError in the standalone binary by reverting how to resolve the bundled Marp Core ([#526](https://github.com/marp-team/marp-cli/issues/526), [#527](https://github.com/marp-team/marp-cli/pull/527))

## v3.0.1 - 2023-06-19

### Fixed

- Temporarily disable ESM engine resolution when using the standalone binary ([#524](https://github.com/marp-team/marp-cli/issues/524), [#525](https://github.com/marp-team/marp-cli/pull/525))

## v3.0.0 - 2023-06-10

### Breaking

- End-of-Lifed Node.js 14 is no longer supported, and required the latest Node.js 16 and later ([#523](https://github.com/marp-team/marp-cli/pull/523))

### Added

- Support ES Modules and async resolution for engine script ([#521](https://github.com/marp-team/marp-cli/pull/521))

### Changed

- Upgrade Marp Core to [v3.7.0](https://github.com/marp-team/marp-core/releases/v3.7.0) ([#523](https://github.com/marp-team/marp-cli/pull/523))
- Upgrade Marpit to [v2.5.0](https://github.com/marp-team/marpit/releases/tag/v2.5.0) ([#523](https://github.com/marp-team/marp-cli/pull/523))
  - Added `paginate: skip` and `paginate: hold`

### Fixed

- Time out of conversion powered by Chromium in v2.5.0 Docker image ([#520](https://github.com/marp-team/marp-cli/issues/520))

---

<details><summary>History of past major versions</summary>

## v2.5.0 - 2023-04-16

### Added

- Stable anchor link support in `bespoke` template ([#518](https://github.com/marp-team/marp-cli/pull/518))
- Support [Puppeteer's new headless mode](https://developer.chrome.com/articles/new-headless/) by `PUPPETEER_HEADLESS_MODE=new` env ([#508](https://github.com/marp-team/marp-cli/pull/508))

### Changed

- Upgrade Marp Core to [v3.6.0](https://github.com/marp-team/marp-core/releases/v3.6.0) ([#517](https://github.com/marp-team/marp-cli/pull/517))
- Upgrade dependent packages to the latest version ([#517](https://github.com/marp-team/marp-cli/pull/517))
- Change `id` attribute for the whole of `bespoke` template's HTML document, to avoid conflicting with slugs generated from Markdown headings ([#516](https://github.com/marp-team/marp-cli/pull/516))

### Fixed

- Fix an edge case about failure of global directive injection by CLI with `--html` option ([#511](https://github.com/marp-team/marp-cli/issues/511), [#519](https://github.com/marp-team/marp-cli/pull/519))

## v2.4.0 - 2023-02-19

### Changed

- [Slide transitions for `bespoke` template](https://github.com/marp-team/marp-cli/blob/main/docs/bespoke-transitions/README.md) powered by [View Transition API](https://www.w3.org/TR/css-view-transitions-1/) is stably available by default ([#447](https://github.com/marp-team/marp-cli/issues/447), [#501](https://github.com/marp-team/marp-cli/pull/501))
- Upgrade Marp Core to [v3.5.0](https://github.com/marp-team/marp-core/releases/v3.5.0) ([#502](https://github.com/marp-team/marp-cli/pull/502))
- Upgrade Node.js and dependent packages ([#502](https://github.com/marp-team/marp-cli/pull/502))

### Fixed

- Apply lazy resolution for engine's `package.json` ([#503](https://github.com/marp-team/marp-cli/pull/503))

## v2.3.0 - 2023-01-08

### Breaking

- [Experimental transition] Adopt the latest spec of [View Transitions](https://www.w3.org/TR/css-view-transitions-1/) that is available in Chrome 109 and later ([#447](https://github.com/marp-team/marp-cli/issues/447), [#483](https://github.com/marp-team/marp-cli/issues/483), [#489](https://github.com/marp-team/marp-cli/pull/489))

### Changed

- Upgrade Marp Core to [v3.4.2](https://github.com/marp-team/marp-core/releases/v3.4.2) ([#493](https://github.com/marp-team/marp-cli/pull/493))
- Upgrade Node.js and dependent packages ([#493](https://github.com/marp-team/marp-cli/pull/493))

## v2.2.2 - 2022-11-21

### Fixed

- Fix segmentation fault that brings while resolving bundled engine ([#487](https://github.com/marp-team/marp-cli/issues/487), [#488](https://github.com/marp-team/marp-cli/pull/488))

## v2.2.1 - 2022-11-20

### Added

- Test against Node.js 18 LTS ([#486](https://github.com/marp-team/marp-cli/pull/486))

### Changed

- Upgrade development Node.js and dependent packages ([#486](https://github.com/marp-team/marp-cli/pull/486))

### Fixed

- Docker image: Use CDN instead of specific mirrors for apk repositories ([#481](https://github.com/marp-team/marp-cli/pull/481) by [@rhtenhove](https://github.com/rhtenhove))

## v2.2.0 - 2022-09-20

### Added

- [`--pdf-outlines` option(s)](https://github.com/marp-team/marp-cli#pdf-output-options) to assign PDF outlines based on slide pages and Markdown headings ([#478](https://github.com/marp-team/marp-cli/issues/478), [#479](https://github.com/marp-team/marp-cli/pull/479))

### Changed

- Upgrade dependent packages to the latest version ([#480](https://github.com/marp-team/marp-cli/pull/480))

## v2.1.4 - 2022-09-10

### Fixed

- Don't suggest to install Chromium in error message if the current platform cannot resolve Chromium by `chrome-launcher` module ([#475](https://github.com/marp-team/marp-cli/issues/475), [#476](https://github.com/marp-team/marp-cli/pull/476))

### Changed

- Upgrade Marp Core to [v3.3.3](https://github.com/marp-team/marp-core/releases/v3.3.3) ([#474](https://github.com/marp-team/marp-cli/pull/474))
- Upgrade Marpit to [v2.4.1](https://github.com/marp-team/marpit/releases/tag/v2.4.1) ([#477](https://github.com/marp-team/marp-cli/pull/477))
- Upgrade Node.js and dependencies ([#473](https://github.com/marp-team/marp-cli/pull/473), [#477](https://github.com/marp-team/marp-cli/pull/477))

## v2.1.3 - 2022-08-17

### Changed

- Re-packaged standalone binaries with no code changes

## v2.1.2 - 2022-08-12

### Changed

- Upgrade Marp Core to [v3.3.2](https://github.com/marp-team/marp-core/releases/v3.3.2) ([#470](https://github.com/marp-team/marp-cli/pull/470))

## v2.1.1 - 2022-08-11

### Added

- Allow enabling [LayoutNG](https://www.chromium.org/blink/layoutng/) while PDF conversion via `CHROME_LAYOUTNG_PRINTING` env ([#469](https://github.com/marp-team/marp-cli/pull/469))

### Changed

- Upgrade Marp Core to [v3.3.1](https://github.com/marp-team/marp-core/releases/v3.3.1) ([#468](https://github.com/marp-team/marp-cli/pull/468))

## v2.1.0 - 2022-08-11

### Added

- macOS: Auto detection of executable path when `CHROME_PATH` env has pointed `.app` directory ([#460](https://github.com/marp-team/marp-cli/issues/460), [#463](https://github.com/marp-team/marp-cli/pull/463))

### Changed

- Docker image: Set `PATH` env to the project directory ([#462](https://github.com/marp-team/marp-cli/pull/462) by [@rhtenhove](https://github.com/rhtenhove))
- Upgrade Marpit to [v2.4.0](https://github.com/marp-team/marpit/releases/v2.4.0) ([#467](https://github.com/marp-team/marp-cli/pull/467))
- Upgrade Marp Core to [v3.3.0](https://github.com/marp-team/marp-core/releases/v3.3.0) ([#467](https://github.com/marp-team/marp-cli/pull/467))
- Upgrade dependent packages to the latest version ([#467](https://github.com/marp-team/marp-cli/pull/467))

## v2.0.4 - 2022-06-08

### Added

- [Experimental transition] Allow setting default duration in custom transition through `--marp-transition-duration` ([#459](https://github.com/marp-team/marp-cli/pull/459))

## v2.0.3 - 2022-06-05

### Changed

- Upgrade Marp Core to [v3.2.1](https://github.com/marp-team/marp-core/releases/tag/v3.2.1) ([#458](https://github.com/marp-team/marp-cli/pull/458))
- Upgrade dependent packages to the latest version ([#458](https://github.com/marp-team/marp-cli/pull/458))

## v2.0.2 - 2022-06-04

### Added

- [Experimental transition] Parse custom transitions declared in `<style scoped>` ([#456](https://github.com/marp-team/marp-cli/pull/456))
- [Experimental transition] A basic support of transition with shared elements (just like PowerPoint Morph and Keynote Magic Move) ([#457](https://github.com/marp-team/marp-cli/pull/457))

## v2.0.1 - 2022-06-01

### Fixed

- [Experimental transition] Fix inconsistent transition by backward navigation via presenter view ([#452](https://github.com/marp-team/marp-cli/issues/452), [#455](https://github.com/marp-team/marp-cli/pull/455))
- Preview mode has unexpected message in the information bar "You are using an unsupported command-line flag" ([#453](https://github.com/marp-team/marp-cli/issues/453), [#454](https://github.com/marp-team/marp-cli/pull/454))

## v2.0.0 - 2022-05-24

### ⚡️ Breaking

- End-of-Lifed Node.js 12 is no longer supported, and required the latest Node.js 14 and later ([#450](https://github.com/marp-team/marp-cli/pull/450))
- Upgrade Marp Core to [v3.2.0](https://github.com/marp-team/marp-core/releases/tag/v3.2.0) ([#450](https://github.com/marp-team/marp-cli/pull/450))
  - This is the first version of using v3 core as a bundled engine. [Refer to major changes in Marp Core v3.0.0.](https://github.com/marp-team/marp-core/releases/tag/v3.0.0)

### Changed

- Upgrade Marpit to [v2.3.1](https://github.com/marp-team/marpit/releases/tag/v2.3.1) ([#450](https://github.com/marp-team/marp-cli/pull/450))
- Updates of experimental transition for bespoke template `--bespoke.transition` ([#447](https://github.com/marp-team/marp-cli/issues/447), [#448](https://github.com/marp-team/marp-cli/pull/448))
  - More built-in transitions (5 transitions -> 33 transitions)
  - Define custom transitions by `@keyframes` declaration in CSS
  - Update spec of `transition` local directive
  - Opt-out transition animation by preferring `prefers-reduced-motion` media query

### Deprecated

- [Marpit v2.3.0](https://github.com/marp-team/marpit/releases/tag/v2.3.0): Shorthand syntax for setting colors `![](red)` has been deprecated ([#450](https://github.com/marp-team/marp-cli/pull/450))

## v1.7.2 - 2022-04-24

### Changed

- Upgrade Marp Core to [v2.4.2](https://github.com/marp-team/marp-core/releases/tag/v2.4.2) ([#446](https://github.com/marp-team/marp-cli/pull/446))
  - Make compatible with a patched markdown-it-emoji ([#445](https://github.com/marp-team/marp-cli/pull/445))
- Upgrade dependent packages to the latest version ([#446](https://github.com/marp-team/marp-cli/pull/446))

## v1.7.1 - 2022-04-12

### Fixed

- Cannot output the conversion result into the drive root ([#442](https://github.com/marp-team/marp-cli/issues/442), [#443](https://github.com/marp-team/marp-cli/pull/443))

### Changed

- Upgrade Marpit to [v2.2.4](https://github.com/marp-team/marpit/releases/tag/v2.2.4) ([#441](https://github.com/marp-team/marp-cli/pull/441))
  - Fixed: Scoped style does not style pseudo elements `section::before` and `section::after` in advanced background
- Upgrade Marp Core to [v2.4.1](https://github.com/marp-team/marp-core/releases/tag/v2.4.1) ([#441](https://github.com/marp-team/marp-cli/pull/441))
  - Added Unicode 14.0 emoji support ([Marp Core v2.4.0](https://github.com/marp-team/marp-core/releases/tag/v2.4.0) / [#438](https://github.com/marp-team/marp-cli/pull/438))
- Bump Node LTS, and improve CI settings ([#437](https://github.com/marp-team/marp-cli/pull/437))
- Upgrade dependent packages to the latest version ([#441](https://github.com/marp-team/marp-cli/pull/441))

## v1.7.0 - 2022-02-23

### Added

- `--notes` option to export presenter notes as text file ([#278](https://github.com/marp-team/marp-cli/issues/278), [#429](https://github.com/marp-team/marp-cli/pull/429) by [@chrisns](https://github.com/chrisns), [#432](https://github.com/marp-team/marp-cli/pull/432))
- Timer for the presenter view of bespoke template ([#314](https://github.com/marp-team/marp-cli/issues/314), [#430](https://github.com/marp-team/marp-cli/pull/430) by [@chrisns](https://github.com/chrisns))
- The draggable splitter in the presenter view of bespoke template ([#427](https://github.com/marp-team/marp-cli/pull/427) by [@chrisns](https://github.com/chrisns), [#433](https://github.com/marp-team/marp-cli/pull/433))
- Make notes font size changeable in bespoke template ([#428](https://github.com/marp-team/marp-cli/pull/428) by [@chrisns](https://github.com/chrisns), [#431](https://github.com/marp-team/marp-cli/pull/431))

### Changed

- Upgrade Node and dependent packages to the latest version ([#434](https://github.com/marp-team/marp-cli/pull/434))

## v1.6.0 - 2022-02-12

### Added

- Experimental `transition` directive for bespoke template is now configurable by YAML object ([#382](https://github.com/marp-team/marp-cli/issues/382), [#425](https://github.com/marp-team/marp-cli/pull/425))

### Fixed

- Disable automation flag in preview window ([#421](https://github.com/marp-team/marp-cli/pull/421))

### Changed

- Upgrade dependent packages to the latest version ([#422](https://github.com/marp-team/marp-cli/pull/422), [#426](https://github.com/marp-team/marp-cli/pull/426))

## v1.5.2 - 2022-01-23

### Changed

- Upgrade Marpit to [v2.2.2](https://github.com/marp-team/marpit/releases/tag/v2.2.2) ([#418](https://github.com/marp-team/marp-cli/pull/418))
- Upgrade Marp Core to [v2.3.2](https://github.com/marp-team/marp-core/releases/tag/v2.3.2) ([#418](https://github.com/marp-team/marp-cli/pull/418))
- Upgrade dependent packages to the latest version ([#418](https://github.com/marp-team/marp-cli/pull/418))

## v1.5.1 - 2022-01-16

### Added

- Allow to set timeout for Puppeteer actions by `PUPPETEER_TIMEOUT` env ([#409](https://github.com/marp-team/marp-cli/pull/409))

### Fixed

- Improved WSL 2 detection and browser resolution ([#410](https://github.com/marp-team/marp-cli/pull/410))
- Update Dockerfile to install required dependency `wayland-dev@edge` ([#411](https://github.com/marp-team/marp-cli/issues/411), [#415](https://github.com/marp-team/marp-cli/pull/415))

### Changed

- Upgrade Marpit to [v2.2.1](https://github.com/marp-team/marpit/releases/tag/v2.2.1) ([#408](https://github.com/marp-team/marp-cli/pull/408))
- Upgrade Marp Core to [v2.3.1](https://github.com/marp-team/marp-core/releases/tag/v2.3.1) ([#408](https://github.com/marp-team/marp-cli/pull/408))
- Upgrade dependent packages to the latest version ([#408](https://github.com/marp-team/marp-cli/pull/408))
- Set `png` as the default type for CLI image options ([#416](https://github.com/marp-team/marp-cli/pull/416))

## v1.5.0 - 2021-11-27

### Changed

- Upgrade Marpit to [v2.2.0](https://github.com/marp-team/marpit/releases/tag/v2.2.0) ([#406](https://github.com/marp-team/marp-cli/pull/406))
  - [`::backdrop` pseudo-element](https://marpit.marp.app/inline-svg?id=backdrop-css-selector) matches to the container SVG ([#358](https://github.com/marp-team/marp-cli/issues/358))
- Upgrade Marp Core to [v2.3.0](https://github.com/marp-team/marp-core/releases/tag/v2.3.0) ([#406](https://github.com/marp-team/marp-cli/pull/406))
- Upgrade dependent packages to the latest version ([#406](https://github.com/marp-team/marp-cli/pull/406))

## v1.4.2 - 2021-11-06

### Fixed

- Improve reliability of connection to Chromium process for conversion ([#395](https://github.com/marp-team/marp-cli/issues/395), [#400](https://github.com/marp-team/marp-cli/pull/400))

### Changed

- Upgrade Marpit to [v2.1.2](https://github.com/marp-team/marpit/releases/tag/v2.1.2) ([#399](https://github.com/marp-team/marp-cli/pull/399))
- Upgrade Marp Core to [v2.2.0](https://github.com/marp-team/marp-core/releases/tag/v2.2.0) ([#399](https://github.com/marp-team/marp-cli/pull/399))
- Upgrade development Node LTS and dependencies to the latest ([#399](https://github.com/marp-team/marp-cli/pull/399))
- Update how to build Docker image to make faster publishing an updated version ([#402](https://github.com/marp-team/marp-cli/pull/402))

## v1.4.1 - 2021-09-26

### Fixed

- Prevent outputting a warning about `CHROME_PATH` env if fallbacked to Edge ([#388](https://github.com/marp-team/marp-cli/pull/388))
- Improve Docker detection for better Chromium execution within general images ([#389](https://github.com/marp-team/marp-cli/pull/389))

## v1.4.0 - 2021-08-29

### Added

- Experimental transitions for bespoke template ([#382](https://github.com/marp-team/marp-cli/issues/382), [#381](https://github.com/marp-team/marp-cli/pull/381))
- Expose Marp Core instance to functional engine via `marp` getter ([#386](https://github.com/marp-team/marp-cli/pull/386))

### Changed

- Update Dock icon in preview mode on macOS to suit for Big Sur ([#380](https://github.com/marp-team/marp-cli/pull/380))
- Update an icon of presenter view in bespoke template ([#384](https://github.com/marp-team/marp-cli/pull/384))
- Adjust default image scale for PPTX from `2.5` to `2` ([#385](https://github.com/marp-team/marp-cli/pull/385))

### Fixed

- Improve an activation behavior from dock in preview mode on macOS ([#380](https://github.com/marp-team/marp-cli/pull/380))
- Optimize the size of runtime script for bespoke template ([#383](https://github.com/marp-team/marp-cli/pull/383))

## v1.3.2 - 2021-08-18

### Fixed

- Create HTML for Puppeteer-based conversion in official Docker image into `/tmp` instead of home directory ([#360](https://github.com/marp-team/marp-cli/issues/360), [#379](https://github.com/marp-team/marp-cli/pull/379))

### Changed

- Reduce dependencies ([#375](https://github.com/marp-team/marp-cli/pull/375))
- Upgrade Marpit to [v2.1.1](https://github.com/marp-team/marpit/releases/tag/v2.1.1) ([#378](https://github.com/marp-team/marp-cli/pull/378))
- Upgrade Marp Core to [v2.1.1](https://github.com/marp-team/marp-core/releases/tag/v2.1.1) ([#378](https://github.com/marp-team/marp-cli/pull/378))
- Upgrade dependent packages to the latest version ([#378](https://github.com/marp-team/marp-cli/pull/378))

## v1.3.1 - 2021-08-12

### Fixed

- A regression of PDF conversion in the standalone binary version ([#373](https://github.com/marp-team/marp-cli/issues/373), [#374](https://github.com/marp-team/marp-cli/pull/374))

## v1.3.0 - 2021-08-11

### Added

- PDF metadata support ([#367](https://github.com/marp-team/marp-cli/issues/367), [#369](https://github.com/marp-team/marp-cli/pull/369))
- `--pdf-notes` option to add presenter notes into PDF as annotations ([#261](https://github.com/marp-team/marp-cli/issues/261), [#369](https://github.com/marp-team/marp-cli/pull/369))
- `author` and `keywords` metadata options / global directives ([#367](https://github.com/marp-team/marp-cli/issues/367), [#370](https://github.com/marp-team/marp-cli/pull/370))

### Fixed

- Cannot parse front-matter if input file had UTF-8 BOM ([#357](https://github.com/marp-team/marp-cli/issues/357), [#372](https://github.com/marp-team/marp-cli/pull/372))

### Changed

- Upgrade dependent packages to the latest version ([#371](https://github.com/marp-team/marp-cli/pull/371))

## v1.2.0 - 2021-07-22

### Added

- Installation guide for Homebrew ([#353](https://github.com/marp-team/marp-cli/pull/353))
- Mention Node.js >= 12 requirement in README ([#359](https://github.com/marp-team/marp-cli/issues/359), [#361](https://github.com/marp-team/marp-cli/pull/361) by [@jlevon](https://github.com/jlevon))

### Changed

- Upgrade Marpit to [v2.1.0](https://github.com/marp-team/marpit/releases/tag/v2.1.0) ([#365](https://github.com/marp-team/marp-cli/pull/365))
  - Follow the latest [CommonMark spec 0.30](https://spec.commonmark.org/0.30/)
- Upgrade Marp Core to [v2.1.0](https://github.com/marp-team/marp-core/releases/tag/v2.1.0) ([#365](https://github.com/marp-team/marp-cli/pull/365))
  - [`math` global directive](https://github.com/marp-team/marp-core#math-global-directive) for switching math typesetting library in current Markdown
- Upgrade dependent packages to the latest ([#365](https://github.com/marp-team/marp-cli/pull/365))

### Removed

- Installation guide for not-maintained Chocolatey ([#350](https://github.com/marp-team/marp-cli/pull/350))

## v1.1.1 - 2021-05-17

### Changed

- Upgrade Marp Core to [v2.0.3](https://github.com/marp-team/marp-core/releases/tag/v2.0.3) ([#351](https://github.com/marp-team/marp-cli/pull/351))
- Upgrade dependent packages to the latest version ([#351](https://github.com/marp-team/marp-cli/pull/351))

## v1.1.0 - 2021-05-11

### Added

- `--image-scale` option for setting the scale factor of rendered image(s) ([#349](https://github.com/marp-team/marp-cli/pull/349))

### Fixed

- Update bespoke navigation plugin to adjust wheel sensitivity for Multi-touch devices ([#340](https://github.com/marp-team/marp-cli/issues/340), [#345](https://github.com/marp-team/marp-cli/pull/345))
- Presenter notes are not applied to PPTX correctly ([#346](https://github.com/marp-team/marp-cli/issues/346), [#347](https://github.com/marp-team/marp-cli/pull/347))

### Changed

- Upgrade dependent packages to the latest version ([#347](https://github.com/marp-team/marp-cli/pull/347))
- Mark preview window as stable ([#348](https://github.com/marp-team/marp-cli/pull/348))

## v1.0.3 - 2021-05-09

### Changed

- Upgrade Marp Core to [v2.0.2](https://github.com/marp-team/marp-core/releases/tag/v2.0.2) ([#344](https://github.com/marp-team/marp-cli/pull/344))
- Upgrade dependent packages to the latest version ([#344](https://github.com/marp-team/marp-cli/pull/344))

## v1.0.2 - 2021-05-08

### Added

- Allow overriding base url through `baseUrl` option ([#343](https://github.com/marp-team/marp-cli/pull/343))

## v1.0.1 - 2021-04-27

### Changed

- Upgrade to [Marpit v2.0.1](https://github.com/marp-team/marpit/releases/tag/v2.0.1) and [Marp Core v2.0.1](https://github.com/marp-team/marp-core/releases/tag/v2.0.1) ([#342](https://github.com/marp-team/marp-cli/pull/342))
- Upgrade dependent packages to the latest version ([#342](https://github.com/marp-team/marp-cli/pull/342))

## v1.0.0 - 2021-04-24

### Breaking

- Dropped Node 10 support ([#338](https://github.com/marp-team/marp-cli/pull/338))

### Added

- Build Docker container image for ARM64 ([#328](https://github.com/marp-team/marp-cli/issues/328), [#339](https://github.com/marp-team/marp-cli/pull/339))
- Allow `MARP_USER` env for Docker image to set an explicit UID/GID ([#334](https://github.com/marp-team/marp-cli/pull/334) by [@davebaird](https://github.com/davebaird))
- Test against Node 16 for Windows ([#338](https://github.com/marp-team/marp-cli/pull/338))

### Changed

- Upgrade [Marpit v2.0.0](https://github.com/marp-team/marpit/releases/tag/v2.0.0) and [Marp Core v2.0.0](https://github.com/marp-team/marp-core/releases/tag/v2.0.0) ([#338](https://github.com/marp-team/marp-cli/pull/338))
- Upgrade Node and dependent packages to the latest version ([#338](https://github.com/marp-team/marp-cli/pull/338))

## v0.23.3 - 2021-03-14

### Fixed

- Conversion into multi images/PPTX takes only the first slide if using Chromium >= v89 ([#325](https://github.com/marp-team/marp-cli/issues/325), [#329](https://github.com/marp-team/marp-cli/pull/329))
- Optimize bespoke template for bfcache ([#323](https://github.com/marp-team/marp-cli/pull/323))

### Changed

- Extract licenses of bundled script for bespoke template into another txt ([#324](https://github.com/marp-team/marp-cli/pull/324))
- Upgrade Puppeteer to v8 ([#329](https://github.com/marp-team/marp-cli/pull/329))
- Upgrade dependent packages to the latest version ([#330](https://github.com/marp-team/marp-cli/pull/330))

## v0.23.2 - 2021-02-11

### Changed

- Upgrade Marp Core to [v1.4.3](https://github.com/marp-team/marp-core/releases/tag/v1.4.3) ([#322](https://github.com/marp-team/marp-cli/pull/322))
- Upgrade dependent packages to the latest version ([#322](https://github.com/marp-team/marp-cli/pull/322))

## v0.23.1 - 2021-02-06

### Changed

- Use Noto CJK font instead of broken font-ipa in Docker image ([#318](https://github.com/marp-team/marp-cli/pull/318))
- Upgrade [Marpit v1.6.4](https://github.com/marp-team/marpit/releases/tag/v1.6.4) and [Marp Core v1.4.1](https://github.com/marp-team/marp-core/releases/tag/v1.4.1) ([#319](https://github.com/marp-team/marp-cli/pull/319))
- Upgrade dependent packages to the latest version ([#319](https://github.com/marp-team/marp-cli/pull/319))
- Rename `master` branch to `main` ([#320](https://github.com/marp-team/marp-cli/pull/320))

### Fixed

- Throw better error when spawning snap Chromium from another snap app ([#317](https://github.com/marp-team/marp-cli/pull/317))

## v0.23.0 - 2020-12-05

### Changed

- Upgrade [Marpit v1.6.3](https://github.com/marp-team/marpit/releases/tag/v1.6.3) and [Marp Core v1.4.0](https://github.com/marp-team/marp-core/releases/tag/v1.4.0) ([#309](https://github.com/marp-team/marp-cli/pull/309))
- Upgrade Node.js to 14 ([#309](https://github.com/marp-team/marp-cli/pull/309))
- Upgrade dependent packages to the latest version ([#309](https://github.com/marp-team/marp-cli/pull/309))

### Fixed

- Reset cached executable Chrome path if using Marp CLI through API interface ([#310](https://github.com/marp-team/marp-cli/pull/310))

## v0.22.1 - 2020-11-28

### Added

- Support for fallback into Microsoft Edge in Linux ([#296](https://github.com/marp-team/marp-cli/issues/296), [#307](https://github.com/marp-team/marp-cli/pull/307))

### Fixed

- Compatibility with Apple Silicon ([#301](https://github.com/marp-team/marp-cli/issues/301), [#305](https://github.com/marp-team/marp-cli/pull/305))

### Changed

- Upgrade dependent packages to the latest version ([#306](https://github.com/marp-team/marp-cli/pull/306))

## v0.22.0 - 2020-10-18

### Added

- Fallback to Microsoft Edge if not installed Chrome ([#199](https://github.com/marp-team/marp-cli/issues/199), [#292](https://github.com/marp-team/marp-cli/pull/292))

### Fixed

- Better support for custom Chrome path via `CHROME_PATH` env in WSL ([#288](https://github.com/marp-team/marp-cli/issues/288), [#292](https://github.com/marp-team/marp-cli/pull/292))
- Apply workaround of printable template fallback, for broken background images caused by regression in Chrome >= 85 ([#293](https://github.com/marp-team/marp-cli/issues/293), [#294](https://github.com/marp-team/marp-cli/pull/294))

### Changed

- Upgrade dependent packages to the latest version ([#295](https://github.com/marp-team/marp-cli/pull/295))

## v0.21.1 - 2020-09-12

### Fixed

- Fix regression in `--allow-local-files` option with Snapd Chromium ([#201](https://github.com/marp-team/marp-cli/issues/201), [#283](https://github.com/marp-team/marp-cli/pull/283))

### Changed

- Use `content-visibility` CSS property in bespoke template ([#277](https://github.com/marp-team/marp-cli/issues/277), [#285](https://github.com/marp-team/marp-cli/pull/285))
- Upgrade dependent packages to the latest version ([#284](https://github.com/marp-team/marp-cli/pull/284))

## v0.21.0 - 2020-08-20

### Added

- Handle `--no-config-file` (`--no-config`) option to prevent looking up for a configuration file ([#274](https://github.com/marp-team/marp-cli/pull/274))
- `--config` option aliased to `--config-file` ([#274](https://github.com/marp-team/marp-cli/pull/274))
- Look up a configuration file with `cjs` extension ([#276](https://github.com/marp-team/marp-cli/pull/276))
- Add port number instructions in readme for server option ([#275](https://github.com/marp-team/marp-cli/pull/275) by [@nuric](https://github.com/nuric))

### Changed

- Upgrade Marp Core to [v1.3.0](https://github.com/marp-team/marp-core/releases/tag/v1.3.0) ([#271](https://github.com/marp-team/marp-cli/pull/271))
- Improve PDF accessibility by enabling `--export-tagged-pdf` Chromium option ([#269](https://github.com/marp-team/marp-cli/pull/269))
- Mark standalone binary as stable ([#273](https://github.com/marp-team/marp-cli/pull/273))
- Upgrade dependent packages to the latest version ([#276](https://github.com/marp-team/marp-cli/pull/276))

## v0.20.0 - 2020-07-25

### Added

- Make public improved API interface for Node.js ([#260](https://github.com/marp-team/marp-cli/pull/260))
- Added info about [Chocolatey](https://chocolatey.org/packages/marp-cli) and [Scoop](https://github.com/ScoopInstaller/Main/blob/master/bucket/marp.json) packages into Readme ([#263](https://github.com/marp-team/marp-cli/pull/263) by [@zverev-iv](https://github.com/zverev-iv))

### Fixed

- Fix invalid permission flag in package script ([#256](https://github.com/marp-team/marp-cli/issues/256), [#257](https://github.com/marp-team/marp-cli/pull/257))
- Get more reliability of connection from Puppeteer to Chrome by using pipe rather than WebSocket ([#259](https://github.com/marp-team/marp-cli/pull/259), [#264](https://github.com/marp-team/marp-cli/pull/264))

### Changed

- Upgrade dependent packages to the latest version ([#265](https://github.com/marp-team/marp-cli/pull/265))

## v0.19.0 - 2020-07-18

### Added

- Skip fragments when navigated page while holding shift key ([#206](https://github.com/marp-team/marp-cli/issues/206), [#248](https://github.com/marp-team/marp-cli/pull/248))
- Keep awake the display in `bespoke` template if [Screen Wake Lock API](https://web.dev/wakelock/) is available (Chrome >= 84) ([#239](https://github.com/marp-team/marp-cli/issues/239), [#246](https://github.com/marp-team/marp-cli/pull/246))
- Test against Node 14 (Fermium) ([#251](https://github.com/marp-team/marp-cli/pull/251))
- Set up GitHub Dependabot for marp-team packages ([#252](https://github.com/marp-team/marp-cli/pull/252))

### Changed

- Upgrade Marp Core to [v1.2.2](https://github.com/marp-team/marp-core/releases/tag/v1.2.2) ([#253](https://github.com/marp-team/marp-cli/pull/253))
- Upgrade dependent packages to the latest version ([#255](https://github.com/marp-team/marp-cli/pull/255))
- Migrate from TSLint to ESLint ([#250](https://github.com/marp-team/marp-cli/pull/250))

### Removed

- Remove Gitpod button ([#254](https://github.com/marp-team/marp-cli/pull/254))

## v0.18.3 - 2020-07-09

### Fixed

- Fix regression about not working `--engine` option ([#240](https://github.com/marp-team/marp-cli/issues/240), [#242](https://github.com/marp-team/marp-cli/pull/242))
- Normalize font family for presenter view and server index ([#241](https://github.com/marp-team/marp-cli/pull/241))

### Changed

- Upgrade Marp Core to [v1.2.1](https://github.com/marp-team/marp-core/releases/tag/v1.2.1) ([#243](https://github.com/marp-team/marp-cli/pull/243))
- Upgrade Node LTS and dependent packages to the latest version ([#243](https://github.com/marp-team/marp-cli/pull/243))

## v0.18.2 - 2020-06-28

### Fixed

- Slides with code block always verbalized by screen-reader ([#236](https://github.com/marp-team/marp-cli/issues/236), [#238](https://github.com/marp-team/marp-cli/pull/238))

### Changed

- Upgrade Node and dependent packages to the latest version ([#237](https://github.com/marp-team/marp-cli/pull/237))

## v0.18.1 - 2020-06-13

### Added

- Recognize `CHROME_ENABLE_EXTENSIONS` environment value for enabling Chrome extensions while converting ([#231](https://github.com/marp-team/marp-cli/issues/231), [#234](https://github.com/marp-team/marp-cli/pull/234))

### Fixed

- Recover experimental preview window option (`--preview`, `-p`) and back out deprecation ([#211](https://github.com/marp-team/marp-cli/issues/211), [#232](https://github.com/marp-team/marp-cli/pull/232))
- Show helpful message if the executable Chrome path could not find out ([#220](https://github.com/marp-team/marp-cli/issues/220), [#234](https://github.com/marp-team/marp-cli/pull/234))

### Changed

- Reduce direct dependencies ([#233](https://github.com/marp-team/marp-cli/pull/233))
- Upgrade Node and dependent packages to the latest version ([#235](https://github.com/marp-team/marp-cli/pull/235))

## v0.18.0 - 2020-06-08

### Fixed

- Add a trailing slash to the directory links on server index page to avoid broken path resolution ([#221](https://github.com/marp-team/marp-cli/pull/221) by [@n-ari](https://github.com/n-ari))
- Restart CSS animations when switching page in bespoke template ([#222](https://github.com/marp-team/marp-cli/pull/222))
- Fix path resolution of the directory whose name included glob special chars ([#227](https://github.com/marp-team/marp-cli/issues/227), [#230](https://github.com/marp-team/marp-cli/pull/230))

### Changed

- Upgrade [Marpit v1.6.2](https://github.com/marp-team/marpit/releases/tag/v1.6.2) and [Marp Core v1.2.0](https://github.com/marp-team/marp-core/releases/tag/v1.2.0) ([#229](https://github.com/marp-team/marp-cli/pull/229))
- Upgrade dependent packages to the latest version ([#229](https://github.com/marp-team/marp-cli/pull/229))

## v0.17.4 - 2020-04-18

### Changed

- Upgrade [Marpit v1.5.2](https://github.com/marp-team/marpit/releases/tag/v1.5.2) and [Marp Core v1.1.1](https://github.com/marp-team/marp-core/releases/tag/v1.1.1) ([#217](https://github.com/marp-team/marp-cli/pull/217))
- Upgrade dependent packages to the latest version ([#217](https://github.com/marp-team/marp-cli/pull/217))

## v0.17.3 - 2020-03-19

### Fixed

- Ignore installing step of `puppeteer-core` in Dockerfile if the compatible tag was not found ([#214](https://github.com/marp-team/marp-cli/pull/214))

### Changed

- Upgrade dependent packages to the latest version ([#212](https://github.com/marp-team/marp-cli/pull/212), [#215](https://github.com/marp-team/marp-cli/pull/215))

### Deprecated

- Hide the experimental `--preview` / `-p` option and show deprecation warning when used ([#211](https://github.com/marp-team/marp-cli/issues/211), [#213](https://github.com/marp-team/marp-cli/pull/213))

## v0.17.2 - 2020-02-25

### Fixed

- PPTX creation does no longer make multiple master slides ([#166](https://github.com/marp-team/marp-cli/issues/166), [#205](https://github.com/marp-team/marp-cli/pull/205))
- Make bespoke plugins robust against storage error ([#207](https://github.com/marp-team/marp-cli/issues/207), [#208](https://github.com/marp-team/marp-cli/pull/208))

### Changed

- Use PptxGenJS v3 instead of `@marp-team/pptx` ([#205](https://github.com/marp-team/marp-cli/pull/205))
- Disable opening presenter view in `bespoke` template if using `localStorage` has restricted in browser ([#208](https://github.com/marp-team/marp-cli/pull/208))
- Use passive event listener as much as possible ([#209](https://github.com/marp-team/marp-cli/pull/209))

## v0.17.1 - 2020-02-22

### Added

- Output warning if enabled `--allow-local-files` and missing local file(s) ([#200](https://github.com/marp-team/marp-cli/pull/200) by [@cosnomi](https://github.com/cosnomi))

### Fixed

- Fix failing `--allow-local-files` option with [Snapd Chromium](https://snapcraft.io/install/chromium/ubuntu) ([#201](https://github.com/marp-team/marp-cli/issues/201), [#203](https://github.com/marp-team/marp-cli/pull/203))

### Changed

- Upgrade Node and dependent packages to the latest version ([#204](https://github.com/marp-team/marp-cli/pull/204))

## v0.17.0 - 2020-01-18

### Breaking

- Drop support for EOL Node 8 (Require Node >= 10) ([#198](https://github.com/marp-team/marp-cli/pull/198))

### Added

- Presenter view for bespoke template ([#142](https://github.com/marp-team/marp-cli/issues/142), [#157](https://github.com/marp-team/marp-cli/pull/157))
- Setup cache, badge, and skip tag support for GitHub Actions ([#186](https://github.com/marp-team/marp-cli/pull/186), [#192](https://github.com/marp-team/marp-cli/pull/192))

### Changed

- Upgrade [Marpit v1.5.0](https://github.com/marp-team/marpit/releases/tag/v1.5.0) and [Marp Core v1.0.1](https://github.com/marp-team/marp-core/releases/tag/v1.0.1) ([#198](https://github.com/marp-team/marp-cli/pull/198))
- Update community health files ([#185](https://github.com/marp-team/marp-cli/pull/185))
- Upgrade Node and dependent packages to the latest version ([#191](https://github.com/marp-team/marp-cli/pull/191), [#198](https://github.com/marp-team/marp-cli/pull/198))

## v0.16.2 - 2019-11-18

### Changed

- Upgrade [Marp Core v0.15.2](https://github.com/marp-team/marp-core/releases/tag/v0.15.2) ([#184](https://github.com/marp-team/marp-cli/pull/184))
- Upgrade dependent packages to the latest version ([#184](https://github.com/marp-team/marp-cli/pull/184))

## v0.16.1 - 2019-11-07

### Fixed

- Fix failing `--allow-local-files` option on WSL environment ([#182](https://github.com/marp-team/marp-cli/pull/182))

## v0.16.0 - 2019-11-06

### Breaking

- Marp CLI requires Node >= v8.16.0
- [GFM strikethrough syntax](https://github.com/marp-team/marp-core/issues/102) added to Marp Core v0.15.0 may break existing slides

### Added

- Add bespoke interactive plugin to improve event handling ([#181](https://github.com/marp-team/marp-cli/pull/181))

### Fixed

- Navigate twice when hitting space bar after clicked next button on OSC ([#156](https://github.com/marp-team/marp-cli/issues/156), [#181](https://github.com/marp-team/marp-cli/pull/181))
- Keep generated `sync` query between navigations ([#162](https://github.com/marp-team/marp-cli/pull/162))

### Changed

- Upgrade Node to v12 LTS ([#179](https://github.com/marp-team/marp-cli/pull/179))
- Upgrade [Marpit v1.4.2](https://github.com/marp-team/marpit/releases/tag/v1.4.2) and [Marp Core v0.15.1](https://github.com/marp-team/marp-core/releases/tag/v0.15.1) ([#179](https://github.com/marp-team/marp-cli/pull/179))
- Upgrade dependent packages to the latest version ([#179](https://github.com/marp-team/marp-cli/pull/179))

### Removed

- CSS hack for Chrome scaling on bare template ([#177](https://github.com/marp-team/marp-cli/issues/177), [#178](https://github.com/marp-team/marp-cli/pull/178))
- Remove deprecated `--bespoke-osc` and `--bespoke-progress` argument options ([#180](https://github.com/marp-team/marp-cli/pull/180))

## v0.15.1 - 2019-11-03

### Fixed

- Fix no response of conversions in WSL environment ([#175](https://github.com/marp-team/marp-cli/issues/175), [#176](https://github.com/marp-team/marp-cli/pull/176))

## v0.15.0 - 2019-10-20

### Fixed

- Safari prevents moving slide after too many navigations ([#158](https://github.com/marp-team/marp-cli/issues/158), [#160](https://github.com/marp-team/marp-cli/pull/160))
- Custom engine doesn't render code blocks well ([#168](https://github.com/marp-team/marp-cli/issues/168), [#172](https://github.com/marp-team/marp-cli/pull/172))
- Support preview mode in macOS Catalina ([#173](https://github.com/marp-team/marp-cli/pull/173))
- Update Dockerfile to work Chromium correctly ([#174](https://github.com/marp-team/marp-cli/pull/174))

### Changed

- Upgrade [Marpit v1.4.1](https://github.com/marp-team/marpit/releases/tag/v1.4.1) and [Marp Core v0.14.0](https://github.com/marp-team/marp-core/releases/tag/v0.14.0) ([#169](https://github.com/marp-team/marp-cli/pull/169))
- Upgrade dependent packages to the latest version ([#164](https://github.com/marp-team/marp-cli/pull/164), [#169](https://github.com/marp-team/marp-cli/pull/169))

### Removed

- Remove the detection of helper script from resolved engine ([#171](https://github.com/marp-team/marp-cli/pull/171))

## v0.14.1 - 2019-09-15

### Fixed

- Vanished auto-fitting elements when exporting to PDF, PPTX, and images ([#153](https://github.com/marp-team/marp-cli/issues/153), [#154](https://github.com/marp-team/marp-cli/pull/154))

### Changed

- Upgrade to [Marp Core v0.13.1](https://github.com/marp-team/marp-core/releases/tag/v0.13.1) ([#155](https://github.com/marp-team/marp-cli/pull/155))
- Upgrade dependent packages to the latest version ([#155](https://github.com/marp-team/marp-cli/pull/155))

## v0.14.0 - 2019-09-12

### Fixed

- Precompile v8 cache while building Docker image ([#148](https://github.com/marp-team/marp-cli/pull/148))

### Changed

- Upgrade [Marpit v1.4.0](https://github.com/marp-team/marpit/releases/tag/v1.4.0) and [Marp Core v0.13.0](https://github.com/marp-team/marp-core/releases/tag/v0.13.0) ([#151](https://github.com/marp-team/marp-cli/pull/151))
- Hold the progress state of fragments on to URL query parameter ([#149](https://github.com/marp-team/marp-cli/pull/149))
- Reduce HTML file size of bespoke template by shortened container tag name and id ([#150](https://github.com/marp-team/marp-cli/pull/150))
- Upgrade Node and depedent packages to the latest version ([#151](https://github.com/marp-team/marp-cli/pull/151))

## v0.13.1 - 2019-09-10

### Added

- Add `v8-compile-cache` to make faster startup ([#139](https://github.com/marp-team/marp-cli/pull/139))
- Sync plugin for bespoke template ([#145](https://github.com/marp-team/marp-cli/pull/145))

### Fixed

- Improve HTML performance after preloading ([#143](https://github.com/marp-team/marp-cli/pull/143))

### Changed

- Migrate CI for Windows into GitHub Actions ([#132](https://github.com/marp-team/marp-cli/issues/132), [#140](https://github.com/marp-team/marp-cli/pull/140), [#146](https://github.com/marp-team/marp-cli/pull/146))
- Update CircleCI configuration to use v2.1 ([#144](https://github.com/marp-team/marp-cli/pull/144))
- Upgrade dependent packages to the latest version ([#147](https://github.com/marp-team/marp-cli/pull/147))

## v0.13.0 - 2019-08-23

### Fixed

- Fix an issue `--allow-local-files` may not work in the old Node + Windows ([#133](https://github.com/marp-team/marp-cli/issues/133), [#136](https://github.com/marp-team/marp-cli/pull/136))

### Changed

- Reconnect to file watcher when disconnected from WebSocket server ([#130](https://github.com/marp-team/marp-cli/pull/130))
- Change port number for file watcher from 52000 to 37717 ([#135](https://github.com/marp-team/marp-cli/issues/135), [#137](https://github.com/marp-team/marp-cli/pull/137))
- Upgrade [Marpit v1.3.2](https://github.com/marp-team/marpit/releases/tag/v1.3.2) and [Marp Core v0.12.1](https://github.com/marp-team/marp-core/releases/tag/v0.12.1) ([#138](https://github.com/marp-team/marp-cli/pull/138))
- Upgrade dependent packages to the latest version ([#138](https://github.com/marp-team/marp-cli/pull/138))

## v0.12.1 - 2019-07-13

### Changed

- Upgrade [Marpit v1.3.0](https://github.com/marp-team/marpit/releases/tag/v1.3.0) and [Marp Core v0.12.0](https://github.com/marp-team/marp-core/releases/tag/v0.12.0) ([#128](https://github.com/marp-team/marp-cli/pull/128))
- Upgrade dependent packages to the latest version ([#128](https://github.com/marp-team/marp-cli/pull/128))

## v0.12.0 - 2019-07-09

### Added

- `--images` option for conversion into multiple image files ([#71](https://github.com/marp-team/marp-cli/issues/71), [#123](https://github.com/marp-team/marp-cli/pull/123))
- `--pptx` option to support conversion into PowerPoint document ([#107](https://github.com/marp-team/marp-cli/issues/107), [#124](https://github.com/marp-team/marp-cli/pull/124))
- Set up CI for Windows with Azure Pipelines ([#120](https://github.com/marp-team/marp-cli/pull/120))

### Changed

- Rename bespoke option arguments using dot notation ([#122](https://github.com/marp-team/marp-cli/pull/122))
- Upgrade dependent packages to the latest version ([#125](https://github.com/marp-team/marp-cli/pull/125))

### Deprecated

- Deprecate `--bespoke-osc` and `--bespoke-progress` argument options in favor of options using dot notation ([#122](https://github.com/marp-team/marp-cli/pull/122))

## v0.11.3 - 2019-06-30

### Fixed

- Fix Windows regression in finding files from directory ([#118](https://github.com/marp-team/marp-cli/pull/118))
- Improve test stability in Windows ([#118](https://github.com/marp-team/marp-cli/pull/118))

## v0.11.2 - 2019-06-30

### Fixed

- Fix that cannot find Markdown from directory that includes non-ASCII code ([#108](https://github.com/marp-team/marp-cli/issues/108), [#109](https://github.com/marp-team/marp-cli/pull/109))
- Process glob-like path that refers to a real file correctly ([#95](https://github.com/marp-team/marp-cli/issues/95), [#117](https://github.com/marp-team/marp-cli/pull/117))

## v0.11.1 - 2019-06-28

### Added

- A demo slide and the button to run in [Gitpod](https://gitpod.io/#https://github.com/marp-team/marp-cli) ([#113](https://github.com/marp-team/marp-cli/pull/113) by [@mouse484](https://github.com/mouse484), [#114](https://github.com/marp-team/marp-cli/pull/114))

### Fixed

- Downgrade pkg to v4.3.x to fix segfault in the standalone build for Windows ([#111](https://github.com/marp-team/marp-cli/issues/111), [#112](https://github.com/marp-team/marp-cli/pull/112))
- Improve error handling while running server ([#115](https://github.com/marp-team/marp-cli/pull/115))
- Fix up not working watch mode ([#116](https://github.com/marp-team/marp-cli/pull/116))

## v0.11.0 - 2019-06-24

### Added

- Support [`size` global directive](https://github.com/marp-team/marp-core/#size-global-directive) of the updated Marp Core ([#110](https://github.com/marp-team/marp-cli/pull/110))

### Changed

- Upgrade to [Marp Core v0.11.0](https://github.com/marp-team/marp-core/releases/tag/v0.11.0) ([#110](https://github.com/marp-team/marp-cli/pull/110))
- Upgrade dependent packages to the latest version ([#110](https://github.com/marp-team/marp-cli/pull/110))

## v0.10.2 - 2019-06-21

### Fixed

- Improve version output when using user-installed Marp Core ([#105](https://github.com/marp-team/marp-cli/pull/105))
- Reduce file size of converted HTML by upgrading Marp Core to [v0.10.2](https://github.com/marp-team/marp-core/releases/tag/v0.10.2) ([#106](https://github.com/marp-team/marp-cli/pull/106))

## v0.10.1 - 2019-06-19

### Fixed

- Improve error handling while starting up server ([#103](https://github.com/marp-team/marp-cli/pull/103) by [@saiya](https://github.com/saiya))

### Changed

- Upgrade to [Marpit v1.2.0](https://github.com/marp-team/marpit/releases/tag/v1.2.0) and [Marp Core v0.10.1](https://github.com/marp-team/marp-core/releases/tag/v0.10.1) ([#104](https://github.com/marp-team/marp-cli/pull/104))
- Upgrade Node and dependent packages to the latest version ([#104](https://github.com/marp-team/marp-cli/pull/104))

## v0.10.0 - 2019-06-03

### Changed

- Upgrade to [Marpit v1.1.0](https://github.com/marp-team/marpit/releases/tag/v1.1.0) and [Marp Core v0.10.0](https://github.com/marp-team/marp-core/releases/tag/v0.10.0) ([#101](https://github.com/marp-team/marp-cli/pull/101))
- Upgrade dependent packages to the latest version ([#101](https://github.com/marp-team/marp-cli/pull/101))

## v0.9.3 - 2019-05-25

### Added

- Output warning if detected blocking local resources while rendering by Chrome ([#84](https://github.com/marp-team/marp-cli/issues/84), [#98](https://github.com/marp-team/marp-cli/pull/98))

### Changed

- Update CircleCI workflow to run `yarn audit` at the beginning ([#97](https://github.com/marp-team/marp-cli/pull/97))
- Upgrade dependent packages to the latest version ([#99](https://github.com/marp-team/marp-cli/pull/99))

## v0.9.2 - 2019-05-10

### Added

- A hidden `--stdin` option to allow to disable reading from stdin as a workaround of hang up ([#93](https://github.com/marp-team/marp-cli/issues/93), [#94](https://github.com/marp-team/marp-cli/pull/94))

## v0.9.1 - 2019-05-08

### Added

- Test with Node 12 (Erbium) ([#91](https://github.com/marp-team/marp-cli/pull/91))
- Add main entry point and type definitions ([#92](https://github.com/marp-team/marp-cli/pull/92))

### Changed

- Pack built standalone binaries ([#90](https://github.com/marp-team/marp-cli/pull/90))

## v0.9.0 - 2019-05-07

### Added

- Shorthand for setting text color via image syntax, from [Marpit v1.0.0](https://github.com/marp-team/marpit/releases/v1.0.0) ([#86](https://github.com/marp-team/marp-cli/pull/86))
- Standalone executable binaries _(Experimental)_ ([#87](https://github.com/marp-team/marp-cli/pull/87), [#88](https://github.com/marp-team/marp-cli/pull/88))
- Automate GitHub release ([#88](https://github.com/marp-team/marp-cli/pull/88))

### Fixed

- Prevent making zombie process while running CI ([#86](https://github.com/marp-team/marp-cli/pull/86))

### Changed

- Upgrade to [Marpit v1.0.0](https://github.com/marp-team/marpit/releases/tag/v1.0.0) and [Marp Core v0.9.0](https://github.com/marp-team/marp-core/releases/tag/v0.9.0) ([#86](https://github.com/marp-team/marp-cli/pull/86))
- Upgrade dependent packages to the latest version ([#86](https://github.com/marp-team/marp-cli/pull/86))

## v0.8.1 - 2019-04-09

### Fixed

- Override engine html option only if defined in CLI ([#83](https://github.com/marp-team/marp-cli/pull/83))

## v0.8.0 - 2019-04-09

### Added

- Support [fragmented list](https://marpit.marp.app/fragmented-list) in bespoke template, from [Marpit v0.9.0](https://github.com/marp-team/marpit/releases/v0.9.0) ([#81](https://github.com/marp-team/marp-cli/pull/81))

### Fixed

- Update a workaround for the stable chrome's crash in docker image ([#80](https://github.com/marp-team/marp-cli/pull/80))

### Changed

- Upgrade to [Marpit v0.9.2](https://github.com/marp-team/marpit/releases/tag/v0.9.2) and [Marp Core v0.8.0](https://github.com/marp-team/marp-core/releases/tag/v0.8.0) ([#81](https://github.com/marp-team/marp-cli/pull/81))
- Upgrade dependent packages to the latest version ([#82](https://github.com/marp-team/marp-cli/pull/82))

## v0.7.0 - 2019-03-19

### Added

- [Direction keyword](https://marpit.marp.app/image-syntax?id=direction-keyword) for background images, from [Marpit v0.8.0](https://github.com/marp-team/marpit/releases/v0.8.0) ([#77](https://github.com/marp-team/marp-cli/pull/77))

### Fixed

- Fix to work Chrome's BGPT feature in preview window ([#78](https://github.com/marp-team/marp-cli/pull/78))

### Changed

- Upgrade to [Marpit v0.8.0](https://github.com/marp-team/marpit/releases/tag/v0.8.0) and [Marp Core v0.7.0](https://github.com/marp-team/marp-core/releases/tag/v0.7.0) ([#77](https://github.com/marp-team/marp-cli/pull/77))
- Upgrade Node and dependent packages to the latest ([#77](https://github.com/marp-team/marp-cli/pull/77))

## v0.6.3 - 2019-03-11

### Changed

- Upgrade Marp Core to [v0.6.2](https://github.com/marp-team/marp-core/releases/tag/v0.6.2) ([#76](https://github.com/marp-team/marp-cli/pull/76))
- Upgrade dependent packages to latest ([#76](https://github.com/marp-team/marp-cli/pull/76))

## v0.6.2 - 2019-02-17

### Fixed

- Fix hanging PDF conversion within Docker image ([#73](https://github.com/marp-team/marp-cli/issues/73), [#74](https://github.com/marp-team/marp-cli/pull/74))

### Changed

- Upgrade to [Marpit v0.7.2](https://github.com/marp-team/marpit/releases/tag/v0.7.2) and [Marp Core v0.6.1](https://github.com/marp-team/marp-core/releases/tag/v0.6.1) ([#75](https://github.com/marp-team/marp-cli/pull/75))
- Upgrade dependent packages to latest ([#75](https://github.com/marp-team/marp-cli/pull/75))

## v0.6.1 - 2019-02-04

### Changed

- Upgrade to [Marpit v0.7.1](https://github.com/marp-team/marpit/releases/tag/v0.7.1) and [Marp Core v0.6.0](https://github.com/marp-team/marp-core/releases/tag/v0.6.0) ([#72](https://github.com/marp-team/marp-cli/pull/72))

## v0.6.0 - 2019-02-02

### Added

- Make the first slide convertible into PNG and JPEG image by `--image` option ([#68](https://github.com/marp-team/marp-cli/pull/68))
- Support `--no-output` option ([#69](https://github.com/marp-team/marp-cli/pull/69))

### Fixed

- Fix wrong MIME type when opening preview of converted file outputted to stdout ([#68](https://github.com/marp-team/marp-cli/pull/68))
- Improved log message when processed Markdown in server mode ([#69](https://github.com/marp-team/marp-cli/pull/69))

### Changed

- Upgrade Node and dependent packages to latest ([#70](https://github.com/marp-team/marp-cli/pull/70))

## v0.5.0 - 2019-01-31

### Added

- Support setting HTML metadata via global directives and CLI options ([#66](https://github.com/marp-team/marp-cli/pull/66))

### Fixed

- Reflect the correct fullscreen icon in bespoke template ([#65](https://github.com/marp-team/marp-cli/pull/65))

### Changed

- Upgrade to [Marpit v0.7.0](https://github.com/marp-team/marpit/releases/tag/v0.7.0) and [Marp Core v0.5.2](https://github.com/marp-team/marp-core/releases/tag/v0.5.2) ([#66](https://github.com/marp-team/marp-cli/pull/66))
- Upgrade dependent packages to latest ([#67](https://github.com/marp-team/marp-cli/pull/67))

## v0.4.0 - 2019-01-26

### Added

- Add a touch-friendly OSC (On-screen controller) to bespoke template ([#62](https://github.com/marp-team/marp-cli/pull/62))
- Make bespoke template's OSC and progress bar configurable ([#62](https://github.com/marp-team/marp-cli/pull/62))

### Changed

- Upgrade dependent packages to latest version, included [Marpit v0.6.1](https://github.com/marp-team/marpit/releases/tag/v0.6.1) and [Marp Core v0.5.1](https://github.com/marp-team/marp-core/releases/tag/v0.5.1) ([#64](https://github.com/marp-team/marp-cli/pull/64))

## v0.3.1 - 2019-01-25

### Fixed

- Fix blank PDF generated in Chrome >= 73 ([#61](https://github.com/marp-team/marp-cli/pull/61) by [@kamijin-fanta](https://github.com/kamijin-fanta))
- Fix failed test in other platform by Windows workaround for Carlo ([#63](https://github.com/marp-team/marp-cli/pull/63))

## v0.3.0 - 2019-01-21

### Changed

- Upgrade Node and dependent packages to latest version, included [Marpit v0.6.0](https://github.com/marp-team/marpit/releases/tag/v0.6.0) and [Marp Core v0.5.0](https://github.com/marp-team/marp-core/releases/tag/v0.5.0) ([#58](https://github.com/marp-team/marp-cli/pull/58))
- Update badge on README ([#59](https://github.com/marp-team/marp-cli/pull/59))

## v0.2.0 - 2018-12-31

### Fixed

- Improve WebKit browser support ([#55](https://github.com/marp-team/marp-cli/pull/55))

### Changed

- Upgrade dependent packages to latest version, included [Marpit v0.5.0](https://github.com/marp-team/marpit/releases/tag/v0.5.0) and [Marp Core v0.4.1](https://github.com/marp-team/marp-core/releases/tag/v0.4.1) ([#56](https://github.com/marp-team/marp-cli/pull/56))

## v0.1.0 - 2018-12-23

### Breaking

- Drop support for Node 6 and Node < 8.9 ([#47](https://github.com/marp-team/marp-cli/pull/47))

### Added

- Support `--preview` option in regular conversion and multiple files ([#47](https://github.com/marp-team/marp-cli/pull/47))
- Add `-p` alias to `--preview` option ([#48](https://github.com/marp-team/marp-cli/pull/48))
- Add toggle button for listing all served resources in server mode ([#49](https://github.com/marp-team/marp-cli/pull/49))
- Toggle full screen by hitting <kbd>f</kbd> / <kbd>F11</kbd> in `bespoke` template ([#50](https://github.com/marp-team/marp-cli/pull/50))
- Add documentation of usage ([#51](https://github.com/marp-team/marp-cli/pull/51))

### Removed

- Remove `util.promisify` polyfill for Node 6 ([#53](https://github.com/marp-team/marp-cli/pull/53))

### Changed

- Upgrade dependent packages to latest version, included [Marpit v0.4.1](https://github.com/marp-team/marpit/releases/tag/v0.4.1) and [Marp Core v0.3.1](https://github.com/marp-team/marp-core/releases/tag/v0.3.1) ([#54](https://github.com/marp-team/marp-cli/pull/54))

## v0.0.15 - 2018-12-06

### Added

- Support functional engine ([#42](https://github.com/marp-team/marp-cli/pull/42))
- Output the configured engine in `version` (`-v`) option ([#43](https://github.com/marp-team/marp-cli/pull/43))
- Experimental support `--preview` option to open preview window provided by [Carlo](https://github.com/GoogleChromeLabs/carlo) ([#44](https://github.com/marp-team/marp-cli/pull/44))

### Fixed

- Ignore `node_modules` in globbing ([#45](https://github.com/marp-team/marp-cli/pull/45))

### Changed

- Include [Marpit v0.4.0](https://github.com/marp-team/marpit/releases/tag/v0.4.0) and [Marp Core v0.3.0](https://github.com/marp-team/marp-core/releases/tag/v0.3.0) ([#46](https://github.com/marp-team/marp-cli/pull/46))
- Update Node environments and dependent packages to latest ([#46](https://github.com/marp-team/marp-cli/pull/46))
- Run `yarn audit` while running CI / publish processes ([#46](https://github.com/marp-team/marp-cli/pull/46))

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

</details>
