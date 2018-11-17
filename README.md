# @marp-team/marp-cli

[![CircleCI](https://img.shields.io/circleci/project/github/marp-team/marp-cli/master.svg?style=flat-square)](https://circleci.com/gh/marp-team/marp-cli/)
[![Codecov](https://img.shields.io/codecov/c/github/marp-team/marp-cli/master.svg?style=flat-square)](https://codecov.io/gh/marp-team/marp-cli)
[![npm](https://img.shields.io/npm/v/@marp-team/marp-cli.svg?style=flat-square)](https://www.npmjs.com/package/@marp-team/marp-cli)
[![LICENSE](https://img.shields.io/github/license/marp-team/marp-cli.svg?style=flat-square)](./LICENSE)

**A CLI interface, for [Marp](https://github.com/marp-team/marp)** (using [@marp-team/marp-core](https://github.com/marp-team/marp-core)) and any slide deck converter based on [Marpit](https://github.com/marp-team/marpit) framework.

It can convert Marp / Marpit Markdown files into static HTML (and CSS).

### :warning: _marp-cli is under construction and not ready to use stable._

## Try it now!

### npx

[npx](https://blog.npmjs.org/post/162869356040/introducing-npx-an-npm-package-runner) is the best tool when you want to convert Markdown right now. Just run below if you are installed [Node.js](https://nodejs.org/) >= 8.2.0:

```bash
# Convert slide deck into HTML
npx @marp-team/marp-cli slide-deck.md
npx @marp-team/marp-cli slide-deck.md -o output.html

# Convert slide deck into PDF
npx @marp-team/marp-cli slide-deck.md --pdf
npx @marp-team/marp-cli slide-deck.md -o output.pdf

# Watch mode
npx @marp-team/marp-cli -w slide-deck.md
```

> :information_source: You have to install [Google Chrome](https://www.google.com/chrome/) (or [Chromium](https://www.chromium.org/)) to convert slide deck into PDF.

### Docker

Do you hate to install node/chrome locally? We have [an official Docker image](https://hub.docker.com/r/marpteam/marp-cli/) ready to use CLI.

```bash
# Convert slide deck into HTML
docker run --rm -v $PWD:/home/marp/app/ marpteam/marp-cli slide-deck.md

# Convert slide deck into PDF by using Chromium in Docker
docker run --rm -v $PWD:/home/marp/app/ marpteam/marp-cli slide-deck.md --pdf

# Watch mode
docker run --rm --init -v $PWD:/home/marp/app/ -p 52000:52000 marpteam/marp-cli -w slide-deck.md
```

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

### Convert to HTML

The passed markdown will be converted to HTML file by default.

#### HTML template

You can choose a built-in HTML template from `bare` and `bespoke`. Default template is `bespoke`.

##### `bare`

The `bare` template only has the minimum asset to give your presentation with browser. There is no extra features.

When the convert engine is changed to [Marpit framework](https://github.com/marp-team/marpit) by setting `engine` option, it would not use any JavaScript.

##### `bespoke`

The `bespoke` is using [Bespoke.js](https://github.com/bespokejs/bespoke) as the name implies. Unlike a primitive `bare` template, it has several features to be useful in a real presentation.

- **Navigation**: Navigate the deck through keyboard or swipe geasture.
- ~~**Progress bar**~~: We cannot use progress bar at the top now.

### Convert to PDF

If you passed `--pdf` option or the output filename specified by `--output` (`-o`) option ends with `.pdf`, Marp CLI would try to convert into PDF file by using the installed [Google Chrome](https://www.google.com/chrome/) or [Chromium](https://www.chromium.org/).

```
marp --pdf slide-deck.md
marp slide-deck.md -o converted.pdf
```

#### Security about local files

Because of the security reason, the converted PDF would not load local files by default. We recommend to upload your assets to online.

But if you want to use local files in rendered PDF, `--alow-local-files` helps to find your local files. It would output warning about the insecure option in each conversions.

```
marp --pdf --allow-local-files slide-deck.md
```

## Watch mode

Marp CLI will observe a change of markdown files when passed with `--watch` (`-w`) option. The conversion is triggered whenever the content of file is updated.

While you are opening the converted HTML in browser, it would refresh the opened page automatically.

## Server mode

Server mode supports on-demand conversion by HTTP request. We must pass `--server` (`-s`) option and a directory to serve.

## Marp / Marpit options

You can confirm the bundled [marp-core](https://github.com/marp-team/marp-core) version by `--version` (`-v`) option.

```console
$ marp --version
@marp-team/marp-cli v0.0.13 (/w @marp-team/marp-core v0.1.0)
```

> :information_source: If you are installed @marp-team/marp-cli to your project, we will always use @marp-team/marp-core installed in your project.

### Allow HTML tags

Marp CLI can be enable HTML tags in Markdown by `--html` option.

```sh
marp --html included-html.md
```

### Custom theme

You can override theme you want to use by `--theme` option. For example to use `gaia` built-in theme in Marp core:

```sh
marp --theme gaia
```

A custom theme also can use by passing CSS file.

```sh
marp --theme custom-theme.css
```

We not need `@theme` CSS metadata in this case.

### Theme set

`--theme-set` option has to specify theme set composed by multiple theme CSS.

```sh
marp --theme-set theme-a.css theme-b.css theme-c.css -- markdown-a.md markdown-b.md
```

### Conversion engine

`--engine` option can swap the conversion engine from [marp-core](https://github.com/marp-team/marp-core).

#### Use Marpit framework

```sh
# Install Marpit framework
npm install @marp-team/marpit --save-dev

# Specify engine to use Marpit
marp --engine @marp-team/marpit marpit-deck.md
```

#### Customize engine

JavaScript configuration file `marp.config.js` can override the engine by function.

Let's try to add new container syntax `:::` through [markdown-it-container](https://github.com/markdown-it/markdown-it-container) plugin.

```sh
npm install markdown-it-container --save-dev
```

```js
// marp.config.js
const { Marp } = require('@marp-team/marp-core')
const markdownItContainer = require('markdown-it-container')

module.exports = {
  engine: opts => {
    const core = new Marp(opts)
    core.markdown.use(markdownItContainer)

    return core
  },
}
```

```markdown
<!-- markdown.md -->
<style>
.columns {
  column-count: 3;
}
</style>

::: columns
Lorem ipsum dolor sit amet, nec ex illud viderer vivendo, mea semper deleniti cu. His in brute justo. Vim facilisis dissentiet ei. Per cu efficiendi theophrastus, te pro dicta mucius, ut sed adhuc ponderum. No iriure convenire pri, ius at possit appareat disputando, mei ei libris oportere.

Mei an temporibus necessitatibus. Mea et possim conceptam rationibus. Ne eos inani quando, suas nulla vituperatoribus te vel. Officiis accusamus pertinacia ad nam, docendi recusabo definitiones vix ex. Ei pri voluptua moderatius, id porro laudem facete mea. Vix ad justo primis accusata, an ius dolores pertinax ocurreret, placerat intellegebat at has.

Vix in vide admodum blandit. Posse elaboraret ex sit. Nusquam appetere definitionem cum no, et ornatus philosophia sit. Eu ferri mediocrem est, melius omnesque eum ad. Ut feugait molestie qualisque has, has ad soleat ridens mandamus. Ut eos sumo feugiat, civibus euripidis ex eam.

Nam errem prompta in. Ea mel dicam aliquid impedit. Nibh utinam graeco vix et. Te munere euripidis quo. His tation prodesset ne, pro ex velit tantas noster.
:::
```

## Author

Managed by [@marp-team](https://github.com/marp-team).

- <img src="https://github.com/yhatt.png" width="16" height="16"/> Yuki Hattori ([@yhatt](https://github.com/yhatt))

## License

[MIT License](LICENSE)
