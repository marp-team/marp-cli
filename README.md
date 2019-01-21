# @marp-team/marp-cli

[![CircleCI](https://img.shields.io/circleci/project/github/marp-team/marp-cli/master.svg?style=flat-square&logo=circleci)](https://circleci.com/gh/marp-team/marp-cli/)
[![Codecov](https://img.shields.io/codecov/c/github/marp-team/marp-cli/master.svg?style=flat-square&logo=codecov)](https://codecov.io/gh/marp-team/marp-cli)
[![npm](https://img.shields.io/npm/v/@marp-team/marp-cli.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/@marp-team/marp-cli)
[![Docker](https://img.shields.io/docker/pulls/marpteam/marp-cli.svg?logo=docker&style=flat-square)](https://hub.docker.com/r/marpteam/marp-cli/)
[![LICENSE](https://img.shields.io/github/license/marp-team/marp-cli.svg?style=flat-square)](./LICENSE)

**A CLI interface, for [Marp](https://github.com/marp-team/marp)** (using [@marp-team/marp-core](https://github.com/marp-team/marp-core)) and any slide deck converter based on [Marpit](https://marpit.marp.app/) framework.

It can convert Marp / Marpit Markdown files into static HTML / CSS and PDF.

![](https://raw.githubusercontent.com/marp-team/marp-cli/master/docs/images/marp-cli.gif)

## Try it now!

### npx

[npx](https://blog.npmjs.org/post/162869356040/introducing-npx-an-npm-package-runner) is the best tool when you want to convert Markdown right now. Just run below if you are installed [Node.js](https://nodejs.org/) >= 8.9.0:

```bash
# Convert slide deck into HTML
npx @marp-team/marp-cli slide-deck.md
npx @marp-team/marp-cli slide-deck.md -o output.html

# Convert slide deck into PDF
npx @marp-team/marp-cli slide-deck.md --pdf
npx @marp-team/marp-cli slide-deck.md -o output.pdf

# Watch mode
npx @marp-team/marp-cli -w slide-deck.md

# Server mode (Pass directory to serve)
npx @marp-team/marp-cli -s ./slides

# Open converted HTML in preview window
npx @marp-team/marp-cli -p slide-deck.md
```

> :information_source: You have to install [Google Chrome](https://www.google.com/chrome/) (or [Chromium](https://www.chromium.org/)) to convert slide deck into PDF.

### Docker

Do you hate to install node/chrome locally? We have [an official Docker image](https://hub.docker.com/r/marpteam/marp-cli/) ready to use CLI.

```bash
# Convert slide deck into HTML
docker run --rm -v $PWD:/home/marp/app/ -e LANG=$LANG marpteam/marp-cli slide-deck.md

# Convert slide deck into PDF by using Chromium in Docker
docker run --rm -v $PWD:/home/marp/app/ -e LANG=$LANG marpteam/marp-cli slide-deck.md --pdf

# Watch mode
docker run --rm --init -v $PWD:/home/marp/app/ -e LANG=$LANG -p 52000:52000 marpteam/marp-cli -w slide-deck.md

# Server mode (Serve current directory)
docker run --rm --init -v $PWD:/home/marp/app -e LANG=$LANG -p 8080:8080 -p 52000:52000 marpteam/marp-cli -s .
```

## Install

### Local installation

We recommend to install Marp CLI into your Node project. You may control the CLI (and engine) version exactly.

```bash
npm install --save-dev @marp-team/marp-cli
```

The installed `marp` command is available in [npm-scripts](https://docs.npmjs.com/misc/scripts) or `npx marp`.

### Global installation

You can install with `-g` option if you want to use `marp` command globally.

```bash
npm install -g @marp-team/marp-cli
```

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

When you want to output the converted result to another directory with keeping the origin directory structure, you can use `--inpur-dir` (`-I`) option. `--output` option would be available for specify the output directory.

### Convert to PDF (`--pdf`)

If you passed `--pdf` option or the output filename specified by `--output` (`-o`) option ends with `.pdf`, Marp CLI will try to convert into PDF file by using the installed [Google Chrome](https://www.google.com/chrome/) or [Chromium](https://www.chromium.org/).

```bash
marp --pdf slide-deck.md
marp slide-deck.md -o converted.pdf
```

#### Security about local files

Because of [the security reason](https://github.com/marp-team/marp-cli/pull/10), **the converted PDF cannot load local files by default.** We recommend to upload your assets to online.

But if you want to use local files in rendered PDF, `--alow-local-files` option helps to find your local files. Warnings about using the insecure option are outputed in each conversions.

```bash
marp --pdf --allow-local-files slide-deck.md
```

### Watch mode (`--watch` / `-w`)

Marp CLI will observe a change of Markdown / used Theme CSS when passed with `--watch` (`-w`) option. The conversion is triggered whenever the content of file is updated.

While you are opening the converted HTML in browser, it would refresh the opened page automatically.

### Server mode (`--server` / `-s`)

Server mode supports on-demand conversion by HTTP request. We require to pass `--server` (`-s`) option and a directory to serve.

![](https://raw.githubusercontent.com/marp-team/marp-cli/master/docs/images/server-mode.gif)

In this mode, the converted file outputs as the result of accessing to server, and not to disk.

You would get the converted PDF by adding `?pdf` query string when requesting. e.g. `http://localhost:8080/deck-a.md?pdf`

#### `index.md` / `PITCHME.md`

Marp CLI server will provide the list of served files by default, but you can place the default Markdown deck like a common web server's `index.html`.

Place Markdown named `index.md` or `PITCHME.md` ([GitPitch style](https://gitpitch.com/docs/getting-started/pitchme/)) to served directory. It would be redirected just accessing to `http://localhost:8080/`.

### Preview window (_Experimental:_ `--preview` / `-p`)

When conversions were executed together with `--preview` (`-p`) option, Marp CLI will open preview window(s) to check the converted result immediately.

Unlike opening with browser, you may present deck with the immersive window. [Watch mode](#watch-mode) is enabled automatically.

> :information_source: `--preview` option cannot use when you are using Marp CLI through official docker image.

## Template

You can choose a built-in HTML templates by `--template` option. Default template is `bespoke`.

```bash
marp --template bespoke slide-deck.md
```

### `bespoke` template (default)

The `bespoke` template is using [Bespoke.js](https://github.com/bespokejs/bespoke) as the name implies. It has several features to be useful in a real presentation.

#### Features

- **Navigation**: Navigate the deck through keyboard or swipe geasture.
- Progress bar _(Not ready to use)_ <!-- It has already implemented but currently user cannot control to show progress bar. -->

### `bare` template

The `bare` template is a primitive template, and there is no extra features. It only has minimum assets to give your presentation with browser.

#### Zero-JS slide deck

When [the conversion engine is changed to Marpit framework by setting `engine` option](#use-marpit-framework), _it would not use any scripts._ Even then, it has enough to use for the browser-based presentation.

```bash
marp --template bare --engine @marp-team/marpit slide-deck.md
```

## Theme

### Override theme

You can override theme you want to use by `--theme` option. For example to use [Gaia](https://github.com/marp-team/marp-core/tree/master/themes#gaia) built-in theme in Marp Core:

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

When you specify the path to JavaScript file in `--engine` option, you may use more customized engine by JS.

It would be useful to convert with a customized engine for supporting the additional syntax that is out of Marp Markdown specification.

#### Example: [markdown-it-mark](https://github.com/markdown-it/markdown-it-mark)

```javascript
// engine.js
const { Marp } = require('@marp-team/marp-core')
const markdownItMark = require('markdown-it-mark')

module.exports = opts => new Marp(opts).use(markdownItMark)
```

```bash
# Install Marp Core and markdown-it-mark
npm install @marp-team/marp-core markdown-it-mark --save-dev

# Specify the path to functional engine
marp --engine ./engine.js slide-deck.md
```

The customized engine would convert `==marked==` to `<mark>marked</mark>`.

### Confirm engine version

By using `--version` (`-v`) option, you may confirm the version of engine that is expected to use in current configuration.

```console
$ marp --version
@marp-team/marp-cli v0.x.x (/w bundled @marp-team/marp-core v0.x.x)
```

Marp CLI prefers to use _an installed core by user_ than the bundled. If the current project has installed `@marp-team/marp-core` individually, it would show its version and the annotation "/w customized engine".

## Configuration file

Marp CLI can be configured options with file, such as `marp.config.js`, `.marprc` (JSON / YAML), and `marp` section of `package.json`. It is useful to configure settings for the whole of project.

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
const { Marp } = require('@marp-team/marp-core')
const container = require('markdown-it-container')

module.exports = {
  // Customize engine on configuration file directly
  engine: opts => new Marp(opts).use(container, 'custom'),
}
```

By default we use configuration file that is placed on current directory, but you may also specify the for configuration file by `--config-file` option (`-c`).

### Options

|        Key        |            Type             |      CLI option       | Description                                                                                            |
| :---------------: | :-------------------------: | :-------------------: | :----------------------------------------------------------------------------------------------------- |
| `allowLocalFiles` |           boolean           | `--allow-local-files` | Allow to access local files from Markdown while converting PDF _(NOT SECURE)_                          |
|     `engine`      | string \| Class \| Function |      `--engine`       | Specify Marpit based engine                                                                            |
|      `html`       |      boolean \| object      |       `--html`        | Enable or disable HTML (Configuration file can pass [the whitelist object] if you are using Marp Core) |
|    `inputDir`     |           string            |  `--input-dir` `-I`   | The base directory to find markdown and theme CSS                                                      |
|      `lang`       |           string            |                       | Define the language of converted HTML                                                                  |
|     `options`     |           object            |                       | The base options for the constructor of engine                                                         |
|     `output`      |           string            |    `--output` `-o`    | Output file path (or directory when input-dir is passed)                                               |
|       `pdf`       |           boolean           |        `--pdf`        | Convert slide deck into PDF                                                                            |
|     `preview`     |           boolean           |   `--preview` `-p`    | Open preview window _(EXPERIMENTAL)_                                                                   |
|     `server`      |           boolean           |    `--server` `-s`    | Enable server mode                                                                                     |
|    `template`     |           string            |     `--template`      | Choose template                                                                                        |
|      `theme`      |           string            |       `--theme`       | Override theme by name or CSS file                                                                     |
|    `themeSet`     |     string \| string[]      |     `--theme-set`     | Path to additional theme CSS files                                                                     |
|      `watch`      |           boolean           |    `--watch` `-w`     | Watch input markdowns for changes                                                                      |

[the whitelist object]: https://github.com/marp-team/marp-core#html-boolean--object

### Advanced

The advanced options that cannot specify through CLI options can be configured by file.

#### Base options for engine constructor

`options` can specify the base options for the constructor of the used engine. You can fine-tune constructor options for [Marp Core](https://github.com/marp-team/marp-core#constructor-options) / [Marpit](https://marpit-api.marp.app/marpit).

For example, this configuration disables Marp Core's line breaks conversion (`\n` to `<br />`) to match for CommonMark, by passing [markdown-it's `breaks` option](https://markdown-it.github.io/markdown-it/#MarkdownIt.new) as `false`.

```json
{
  "options": {
    "markdown": {
      "breaks": false
    }
  }
}
```

> :warning: Some options may be overridden by used template.

## Contributing

Are you interested in contributing? Please see [CONTRIBUTING.md](.github/CONTRIBUTING.md).

## Author

Managed by [@marp-team](https://github.com/marp-team).

- <img src="https://github.com/yhatt.png" width="16" height="16"/> Yuki Hattori ([@yhatt](https://github.com/yhatt))

## License

This tool releases under the [MIT License](LICENSE).
