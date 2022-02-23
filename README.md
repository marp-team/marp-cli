# @marp-team/marp-cli

[![CircleCI](https://img.shields.io/circleci/project/github/marp-team/marp-cli/main.svg?style=flat-square&logo=circleci)](https://circleci.com/gh/marp-team/marp-cli/)
[![GitHub Workflow Status](https://img.shields.io/github/workflow/status/marp-team/marp-cli/Test%20for%20Windows/main?style=flat-square&logo=github)](https://github.com/marp-team/marp-cli/actions?query=workflow%3A%22Test+for+Windows%22+branch%3Amain)
[![Codecov](https://img.shields.io/codecov/c/github/marp-team/marp-cli/main.svg?style=flat-square&logo=codecov)](https://codecov.io/gh/marp-team/marp-cli)
[![npm](https://img.shields.io/npm/v/@marp-team/marp-cli.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/@marp-team/marp-cli)
[![Docker](https://img.shields.io/docker/pulls/marpteam/marp-cli.svg?logo=docker&style=flat-square)](https://hub.docker.com/r/marpteam/marp-cli/)
[![LICENSE](https://img.shields.io/github/license/marp-team/marp-cli.svg?style=flat-square)](./LICENSE)

**A CLI interface, for [Marp](https://github.com/marp-team/marp)** (using [@marp-team/marp-core](https://github.com/marp-team/marp-core)) and any slide deck converter based on [Marpit](https://marpit.marp.app/) framework.

It can convert Marp / Marpit Markdown files into static HTML / CSS, PDF, PowerPoint document, and image(s) easily.

<p align="center">
  <img src="https://raw.githubusercontent.com/marp-team/marp-cli/main/docs/images/marp-cli.gif" />
</p>

## Try it now!

### npx

[npx (`npm exec`)](https://docs.npmjs.com/cli/v7/commands/npx) is the best way to use the latest Marp CLI if you wanted
one-shot Markdown conversion _without install_. Just run below if you have
installed [Node.js](https://nodejs.org/) 12 and later.

```bash
# Convert slide deck into HTML
npx @marp-team/marp-cli@latest slide-deck.md
npx @marp-team/marp-cli@latest slide-deck.md -o output.html

# Convert slide deck into PDF
npx @marp-team/marp-cli@latest slide-deck.md --pdf
npx @marp-team/marp-cli@latest slide-deck.md -o output.pdf

# Convert slide deck into PowerPoint document (PPTX)
npx @marp-team/marp-cli@latest slide-deck.md --pptx
npx @marp-team/marp-cli@latest slide-deck.md -o output.pptx

# Watch mode
npx @marp-team/marp-cli@latest -w slide-deck.md

# Server mode (Pass directory to serve)
npx @marp-team/marp-cli@latest -s ./slides
```

> :information_source: You have to install [Google Chrome], [Chromium], or [Microsoft Edge] to convert slide deck into PDF, PPTX, and image(s).

[google chrome]: https://www.google.com/chrome/
[chromium]: https://www.chromium.org/
[microsoft edge]: https://www.microsoft.com/edge

### Docker

Don't you like installing Node.js and Chrome to local? We have [an official Docker image `marpteam/marp-cli`][marp-cli-docker] ready to use CLI.

[Please refer how to use at Docker Hub.][marp-cli-docker]

[marp-cli-docker]: https://hub.docker.com/r/marpteam/marp-cli/

## Install

### Use package manager

You can use the package manager to install/update Marp CLI easily.

- **macOS**
  - **[Homebrew](https://brew.sh/)**: `brew install marp-cli` ([Refer to the formula...](https://github.com/Homebrew/homebrew-core/blob/master/Formula/marp-cli.rb))

* **Windows**
  - **[Scoop](https://scoop.sh/)**: `scoop install marp` ([Refer to the manifest in Main bucket...](https://github.com/ScoopInstaller/Main/blob/master/bucket/marp.json))

_Disclaimer: Package manifests are maintained by the community, not Marp team._

### Local installation

We recommend to install Marp CLI into your Node project. You may control the CLI (and engine) version exactly.

```bash
npm install --save-dev @marp-team/marp-cli
```

Node.js 12 and later is required to install Marp CLI. The installed `marp` command is available in [npm-scripts](https://docs.npmjs.com/misc/scripts) or `npx marp`.

#### Global installation

You can install with `-g` option if you want to use `marp` command globally.

```bash
npm install -g @marp-team/marp-cli
```

### [Standalone binary][releases]

We also provide standalone binaries for Linux, macOS, and Windows.

**[:fast_forward: Download the latest standalone binary from release page.][releases]**

[releases]: https://github.com/marp-team/marp-cli/releases

## Basic usage

### Convert to HTML

The passed markdown will be converted to HTML file by default. In the below example, a converted `slide-deck.html` will output to the same directory.

```bash
marp slide-deck.md
```

You can change the output path by `--output` (`-o`) option.

```bash
marp slide-deck.md -o output.html
```

Marp CLI supports converting multiple files by passing multiple paths, directories, and glob patterns. In this case, `--output` option cannot use.

When you want to output the converted result to another directory with keeping the origin directory structure, you can use `--input-dir` (`-I`) option. `--output` option would be available for specify the output directory.

### Convert to PDF (`--pdf`)

If you passed `--pdf` option or the output filename specified by `--output` (`-o`) option ends with `.pdf`, Marp CLI will try to convert into PDF file by using [Google Chrome], [Chromium], [Microsoft Edge], or a Chromium based browser.

```bash
marp --pdf slide-deck.md
marp slide-deck.md -o converted.pdf
```

> :information_source: All kind of conversions except HTML require [Google Chrome], [Chromium], [Microsoft Edge], or a Chromium based browser. When an unexpected problem has occurred while converting, please update your browser to the latest version or try installing [Google Chrome Canary].
>
> If you want to use a browser other than Google Chrome, Chromium, or Microsoft Edge, specify the path to a Chromium based browser using the `CHROME_PATH` environment variable. For example: `CHROME_PATH=$(which brave) marp --pdf slide-deck.md`

[google chrome canary]: https://www.google.com/chrome/canary/

If your slide deck had included [Marpit presenter notes] as HTML comment, you can add note annotations to the lower left by using `--pdf-notes` option together with `--pdf`.

[marpit presenter notes]: https://marpit.marp.app/usage?id=presenter-notes

### Convert to PowerPoint document (`--pptx`)

Do you want more familiar way to present and share your deck? PPTX conversion to create PowerPoint document is available by passing `--pptx` option or specify the output path with PPTX extension.

```bash
marp --pptx slide-deck.md
marp slide-deck.md -o converted.pptx
```

A created PPTX includes rendered Marp slide pages and the support of [Marpit presenter notes]. It can open with PowerPoint, Keynote, Google Slides, LibreOffice Impress, and so on...

<p align="center">
  <img src="https://raw.githubusercontent.com/marp-team/marp-cli/main/docs/images/pptx.png" height="300" />
</p>

> :information_source: A converted PPTX consists of pre-rendered images. Please note that contents would not be able to modify or re-use in PowerPoint.

### Convert to PNG/JPEG image(s)

#### Multiple images (`--images`)

You can convert the slide deck into multiple images when specified `--images [png|jpeg]` option.

```bash
# Convert into multiple PNG image files
marp --images png slide-deck.md

# Convert into multiple JPEG image files
marp --images jpeg slide-deck.md
```

Output files have a suffix of page number, like `slide-deck.001.png`, `slide-deck.002.png`, and so on.

#### Title slide (`--image`)

When you passed `--image` option or specified the output path with PNG/JPEG extension, Marp CLI will convert _only the first page (title slide)_ of the targeted slide deck into an image.

```bash
# Convert the title slide into an image
marp --image png slide-deck.md
marp slide-deck.md -o output.png
```

It would be useful for creating [Open Graph] image that can specify with [`image` global directive and `--og-image` option](#metadata).

#### Scale factor

You can set the scale factor for rendered image(s) through `--image-scale` option. It is useful for making high-resolution image from the slide.

```bash
# Generate high-resolution image of the title slide
marp slide-deck.md -o title-slide@2x.png --image-scale 2
```

> :information_source: `--image-scale` is not affect to the actual size of presentation.
>
> It is also available for PPTX conversion. By default, Marp CLI will use `2` as the default scale factor in PPTX to suppress deterioration of slide rendering in full-screen presentation.

### Export presenter notes (`--notes`)

You can export [presenter notes][marpit presenter notes] in Marp / Marpit Markdown as a text file by using `--notes` option or specifying the output path with TXT extension.

```bash
# Export presenter notes as a text
marp --notes slide-deck.md
marp slide-deck.md -o output.txt
```

### Security about local files

Because of [the security reason](https://github.com/marp-team/marp-cli/pull/10#user-content-security), **PDF, PPTX and image(s) conversion cannot use local files by default.**

Marp CLI would output incompleted result with warning if the blocked local file accessing is detected. We recommend uploading your assets to online.

If you really need to use local files in these conversion, `--alow-local-files` option helps to find your local files. _Please use only to the trusted Markdown because there is a potential security risk._

```bash
marp --pdf --allow-local-files slide-deck.md
```

## Conversion modes

### Watch mode (`--watch` / `-w`) <a name="watch-mode"></a>

Marp CLI will observe a change of Markdown and using theme CSS when passed with `--watch` (`-w`) option. The conversion will be triggered whenever the content of file is updated.

While you are opening the converted HTML in browser, it would refresh the opened page automatically.

### Server mode (`--server` / `-s`)

Server mode supports on-demand conversion by HTTP request. We require to pass `--server` (`-s`) option and a directory to serve.

<p align="center">
  <img src="https://raw.githubusercontent.com/marp-team/marp-cli/main/docs/images/server-mode.gif" />
</p>

In this mode, the converted file outputs as the result of accessing to server, and not to disk. You can set the server port by setting the environment variable `PORT`, for example `PORT=5000 marp -s ./slides` would listen on port number 5000.

You would get the converted PDF, PPTX, PNG, and JPEG by adding corresponded query string when requesting. e.g. `http://localhost:8080/deck-a.md?pdf` returns converted PDF.

#### `index.md` / `PITCHME.md`

Marp CLI server will provide the list of served files by default, but you can place the default Markdown deck like a common web server's `index.html`.

Place Markdown named `index.md` or `PITCHME.md` ([GitPitch style](https://gitpitch.com/docs/getting-started/pitchme/)) to served directory. It would be redirected just accessing to `http://localhost:8080/`.

### Preview window (`--preview` / `-p`)

When conversions were executed together with `--preview` (`-p`) option, Marp CLI will open preview window(s) to check the converted result immediately.

Unlike opening with browser, you may present deck with the immersive window.
[Watch mode](#watch-mode) is automatically enabled while using preview window.

> :information_source: `--preview` option cannot use when you are using Marp CLI through official docker image.

## Template

You can choose a built-in HTML templates by `--template` option. Default template is `bespoke`.

```bash
marp --template bespoke slide-deck.md
```

### `bespoke` template (default)

The `bespoke` template is using [Bespoke.js](https://github.com/bespokejs/bespoke) as the name implies. It has several features to be useful in a real presentation. A few features may control by CLI options.

#### Features

- **Navigation**: Navigate the deck through keyboard and swipe geasture.
- **Fullscreen**: Toggle fullscreen by hitting <kbd>f</kbd> / <kbd>F11</kbd> key.
- **On-screen controller**: There is a touch-friendly OSC. You may also disable by `--bespoke.osc=false` if unneccesary.
- **Fragmented list**: Recognize [Marpit's fragmented list](https://github.com/marp-team/marpit/issues/145) and appear list one-by-one if used `*` and `1)` as the bullet marker.
- **Presenter view**: Open presenter view in external window by hitting <kbd>p</kbd> key.
- **Progress bar** (optional): By setting `--bespoke.progress` option, you can add a progress bar on the top of the deck.
- [**Slide transitions** _(EXPERIMENTAL)_][transitions]: You may turn on slide transitions support powered by [Shared Element Transitions API proposal](https://github.com/WICG/shared-element-transitions) by `--bespoke.transition` option. Refer to [marp-team/marp-cli#382][transitions] for details.

[transitions]: https://github.com/marp-team/marp-cli/issues/382

> ℹ️ Presenter view may be disabled if [the browser restricted using localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API#Feature-detecting_localStorage) (e.g. Open HTML in the old Safari with private browsing, or open the _local_ HTML file with Chrome that has blocked 3rd party cookies in `chrome://settings/content/cookies`).

### `bare` template

The `bare` template is a primitive template, and there is no extra features. It only has minimum assets to give your presentation with browser.

#### Zero-JS slide deck

When [the conversion engine is changed to Marpit framework by setting `engine` option](#use-marpit-framework), _it would not use any scripts._ Even then, it has enough to use for the browser-based presentation.

```bash
marp --template bare --engine @marp-team/marpit slide-deck.md
```

## Metadata

Through [global directives] or CLI options, you can set metadata for a converted HTML, PDF, and PPTX slide deck.

| [Global directives] |   CLI option    | Description                     | Available in    |
| :-----------------: | :-------------: | :------------------------------ | :-------------- |
|       `title`       |    `--title`    | Define title of the slide deck  | HTML, PDF, PPTX |
|    `description`    | `--description` | Define description of the slide | HTML, PDF, PPTX |
|      `author`       |   `--author`    | Define author of the slide deck | HTML, PDF, PPTX |
|     `keywords`      |  `--keywords`   | Define comma-separated keywords | HTML, PDF       |
|        `url`        |     `--url`     | Define [canonical URL] \*       | HTML            |
|       `image`       |  `--og-image`   | Define [Open Graph] image URL   | HTML            |

> \*: If could not parse a specified value as valid, the URL will be ignored.

[canonical url]: https://en.wikipedia.org/wiki/Canonical_link_element
[open graph]: http://ogp.me/

### By [global directives]

Marp CLI supports _additional [global directives]_ to specify metadata in Markdown. You can define meta values in Markdown front-matter.

```markdown
---
title: Marp slide deck
description: An example slide deck created by Marp CLI
author: Yuki Hattori
keywords: marp,marp-cli,slide
url: https://marp.app/
image: https://marp.app/og-image.jpg
---

# Marp slide deck
```

[global directives]: https://marpit.marp.app/directives?id=global-directives-1

### By CLI option

Marp CLI prefers CLI option to global directives. You can override metadata values by `--title`, `--description`, `--author`, `--keywords`, `--url`, and `--og-image`.

## Theme

### Override theme

You can override theme you want to use by `--theme` option. For example to use [Gaia](https://github.com/marp-team/marp-core/tree/main/themes#gaia) built-in theme in Marp Core:

```bash
marp --theme gaia
```

### Use custom theme

A custom theme created by user also can use easily by passing the path of CSS file.

```bash
marp --theme custom-theme.css
```

> :information_source: Normally [Marpit theme CSS requires `@theme` meta comment](https://marpit.marp.app/theme-css?id=metadata), but it's not required in this usage.

### Theme set

`--theme-set` option has to specify theme set composed by multiple theme CSS files. The registed themes are usable in [Marpit's `theme` directive](https://marpit.marp.app/directives?id=theme).

```bash
# Multiple theme CSS files
marp --theme-set theme-a.css theme-b.css theme-c.css -- deck-a.md deck-b.md

# Theme directory
marp --theme-set ./themes -- deck.md
```

## Engine

Marp CLI is calling the [Marpit framework](https://marpit.marp.app/) based converter as "Engine". Normally we use the bundled [marp-core](https://github.com/marp-team/marp-core), but you may swap the conversion engine to another Marpit based engine through `--engine` option.

### Use Marpit framework

For example, it can convert Markdown by using the pure Marpit framework.

```bash
# Install Marpit framework
npm i @marp-team/marpit

# Specify engine to use Marpit
marp --engine @marp-team/marpit marpit-deck.md
```

Notice that Marpit has not provided theme. It would be good to include inline style in Markdown, or pass CSS file by `--theme` option.

### Functional engine

When you specified the path to JavaScript file in `--engine` option, you may use more customized engine by a JavaScript function.

#### Spec

The functional engine should export a function with one parameter, which is a constructor option of Marpit. The function must return an instance of Marpit-based engine made by the passed parameter.

```javascript
module.exports = function (constructorOption) {
  return new MarpitBasedEngine(constructorOption)
}
```

Marp CLI also exposes `marp` getter property to the parameter. It returns a prepared instance of the built-in Marp Core engine, so you can apply several customizations to Marp engine with simple declarations.

```javascript
module.exports = ({ marp }) => marp.use(marpPlugin).use(andMorePlugin)
```

It allows converting Markdown with additional syntaxes that were provided by Marp (or compatible markdown-it) plugins.

#### Example: [markdown-it-mark](https://github.com/markdown-it/markdown-it-mark)

```javascript
// engine.js
const markdownItMark = require('markdown-it-mark')

module.exports = ({ marp }) => marp.use(markdownItMark)
```

```bash
# Install markdown-it-mark
npm install markdown-it-mark --save

# Specify the path to functional engine
marp --engine ./engine.js slide-deck.md
```

The customized engine will convert `==marked==` to `<mark>marked</mark>`.

### Confirm engine version

By using `--version` (`-v`) option, you may confirm the version of engine that is expected to use in current configuration.

```console
$ marp --version
@marp-team/marp-cli v1.x.x (w/ @marp-team/marp-core v2.x.x)
```

### Use specific version of Marp Core

Marp CLI prefers to use _an installed core to local project by user_ than the bundled.

If the current project has installed `@marp-team/marp-core` individually, it would show its version and the annotation: `w/ user-installed @marp-team/marp-core vX.X.X` or `w/ customized engine`.

```console
$ npm i @marp-team/marp-cli @marp-team/marp-core@^3.0.0 --save-dev
$ npx marp --version
@marp-team/marp-cli v1.x.x (w/ user-installed @marp-team/marp-core v3.0.0)
```

## Configuration file

Marp CLI can be configured options with file, such as `marp.config.js`, `marp.config.cjs`, `.marprc` (JSON / YAML), and `marp` section of `package.json`. It is useful to configure settings for the whole of project.

```javascript
// package.json
{
  "marp": {
    "inputDir": "./slides",
    "output":" ./public",
    "themeSet": "./themes"
  }
}
```

```yaml
# .marprc.yml
allowLocalFiles: true
options:
  looseYAML: false
  markdown:
    breaks: false
pdf: true
```

```javascript
// marp.config.js
const markdownItContainer = require('markdown-it-container')

module.exports = {
  // Customize engine on configuration file directly
  engine: ({ marp }) => marp.use(markdownItContainer, 'custom'),
}
```

By default we use configuration file that is placed on current directory, but you may also specify the path for a configuration file by `--config-file` (`--config` / `-c`) option.

If you want to prevent looking up a configuration file, you can pass `--no-config-file` (`--no-config`) option.

### Options

| Key               |            Type             |       CLI option       | Description                                                                                                 |
| :---------------- | :-------------------------: | :--------------------: | :---------------------------------------------------------------------------------------------------------- |
| `allowLocalFiles` |           boolean           | `--allow-local-files`  | Allow to access local files from Markdown while converting PDF _(NOT SECURE)_                               |
| `author`          |           string            |       `--author`       | Define author of the slide deck                                                                             |
| `bespoke`         |           object            |                        | Setting options for `bespoke` template                                                                      |
| ┗ `osc`           |           boolean           |    `--bespoke.osc`     | \[Bespoke\] Use on-screen controller (`true` by default)                                                    |
| ┗ `progress`      |           boolean           |  `--bespoke.progress`  | \[Bespoke\] Use progress bar (`false` by default)                                                           |
| ┗ `transition`    |           boolean           | `--bespoke.transition` | \[Bespoke\] [Enable transitions powered by Shared Element Transitions API][transitions] (EXPERIMENTAL)      |
| `description`     |           string            |    `--description`     | Define description of the slide deck                                                                        |
| `engine`          | string \| Class \| Function |       `--engine`       | Specify Marpit based engine                                                                                 |
| `html`            |      boolean \| object      |        `--html`        | Enable or disable HTML tags (Configuration file can pass [the whitelist object] if you are using Marp Core) |
| `image`           |       `png` \| `jpeg`       |       `--image`        | Convert the first slide page into an image file                                                             |
| `images`          |       `png` \| `jpeg`       |       `--images`       | Convert slide deck into multiple image files                                                                |
| `imageScale`      |           number            |    `--image-scale`     | The scale factor for rendered images (`1` by default, or `2` for PPTX conversion)                           |
| `inputDir`        |           string            |   `--input-dir` `-I`   | The base directory to find markdown and theme CSS                                                           |
| `jpegQuality`     |           number            |    `--jpeg-quality`    | Setting JPEG image quality (`85` by default)                                                                |
| `keywords`        |     string \| string[]      |      `--keywords`      | Define keywords for the slide deck (Accepts comma-separated string and array of string)                     |
| `lang`            |           string            |                        | Define the language of converted HTML                                                                       |
| `notes`           |           boolean           |       `--notes`        | Convert slide deck notes into a text file                                                                   |
| `ogImage`         |           string            |      `--og-image`      | Define [Open Graph] image URL                                                                               |
| `options`         |           object            |                        | The base options for the constructor of engine                                                              |
| `output`          |           string            |    `--output` `-o`     | Output file path (or directory when input-dir is passed)                                                    |
| `pdf`             |           boolean           |        `--pdf`         | Convert slide deck into PDF                                                                                 |
| `pdfNotes`        |           boolean           |     `--pdf-notes`      | Add [presenter notes][marpit presenter notes] to PDF as annotations                                         |
| `preview`         |           boolean           |    `--preview` `-p`    | Open preview window                                                                                         |
| `server`          |           boolean           |    `--server` `-s`     | Enable server mode                                                                                          |
| `template`        |     `bare` \| `bespoke`     |      `--template`      | Choose template (`bespoke` by default)                                                                      |
| `theme`           |           string            |       `--theme`        | Override theme by name or CSS file                                                                          |
| `themeSet`        |     string \| string[]      |     `--theme-set`      | Path to additional theme CSS files                                                                          |
| `title`           |           string            |       `--title`        | Define title of the slide deck                                                                              |
| `url`             |           string            |        `--url`         | Define [canonical URL]                                                                                      |
| `watch`           |           boolean           |     `--watch` `-w`     | Watch input markdowns for changes                                                                           |

[the whitelist object]: https://github.com/marp-team/marp-core#html-boolean--object

### Advanced

The advanced options that cannot specify through CLI options can be configured by file.

#### Base options for engine constructor

`options` can set the base options for the constructor of the used engine. You can fine-tune constructor options for [Marp Core](https://github.com/marp-team/marp-core#constructor-options) / [Marpit](https://marpit-api.marp.app/marpit).

##### Example

The below configuration will set constructor option for Marp Core as specified:

- Disables [Marp Core's line breaks conversion](https://github.com/marp-team/marp-core#marp-markdown) (`\n` to `<br />`) to match for CommonMark, by passing [markdown-it's `breaks` option](https://markdown-it.github.io/markdown-it/#MarkdownIt.new) as `false`.
- Disable minification for rendered theme CSS to make debug your style easily, by passing [`minifyCSS`](https://github.com/marp-team/marp-core#minifycss-boolean) as `false`.

```json
{
  "options": {
    "markdown": {
      "breaks": false
    },
    "minifyCSS": false
  }
}
```

> :warning: Some options may be overridden by used template.

## API _(EXPERIMENTAL)_

You can use Marp CLI through Node.js [if installed Marp CLI into your local project](#local-installation).

```js
const { marpCli } = require('@marp-team/marp-cli')

marpCli(['test.md', '--pdf'])
  .then((exitStatus) => {
    if (exitStatus > 0) {
      console.error(`Failure (Exit status: ${exitStatus})`)
    } else {
      console.log('Success')
    }
  })
  .catch(console.error)
```

`marpCli()` accepts an argument of CLI options as array, and returns `Promise` to resolve an expected exit status in CLI. It would be rejected with the instance of `Error` if CLI met an error to suspend the conversion process.

### Error handling

We have exported [`CLIError` class and `CLIErrorCode` enum](https://github.com/marp-team/marp-cli/blob/main/src/error.ts) from `@marp-team/marp-cli`, to allow handling for specific errors that have already known by Marp CLI.

If `CLIError` instance was thrown, you can identify the reason why CLI throwed error by checking `errorCode` member.

### Wait for observation

`marpCli()` would not be resolved initiatively if started some observation: Watch mode, server mode, and preview window.

`waitForObservation()` is helpful to handle them. It returns `Promise` that would be resolved with helper object when ready to observe resources in `marpCli()`.

```javascript
const { marpCli, waitForObservation } = require('@marp-team/marp-cli')

marpCli(['--server', './slides/'])
  .then((exitCode) => console.log(`Done with exit code ${exitCode}`))
  .catch(console.error)

waitForObservation().then(({ stop }) => {
  console.log('Observed')

  // Stop observations to resolve marpCli()'s Promise
  stop()
})
```

The resolved helper has `stop()` method for telling Marp CLI to stop observation and resolve `Promise`.

## Contributing

Are you interested in contributing? Please see [CONTRIBUTING.md](.github/CONTRIBUTING.md) and [the common contributing guideline for Marp team](https://github.com/marp-team/.github/blob/master/CONTRIBUTING.md).

## Author

Managed by [@marp-team](https://github.com/marp-team).

- <img src="https://github.com/yhatt.png" width="16" height="16"/> Yuki Hattori ([@yhatt](https://github.com/yhatt))

## License

This tool releases under the [MIT License](LICENSE).
