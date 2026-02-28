# Patches

This directory contains patches for Marp CLI dev dependencies, powered by [patch-package](https://github.com/ds300/patch-package).

Patches in this directory will be applied when `npm install` run, through `prepare` script hook in `package.json`.

> [!WARNING]
>
> Please avoid creating new patches unless absolutely necessary. In that case, please limit the target to patch to development dependencies only ([suffixed with `.dev.patch`](https://www.npmjs.com/package/patch-package#dev-only-patches)), and ensure that the reason for the patch is documented in this file.

## Reasons for patches

### [jsdom](https://github.com/jsdom/jsdom)

This patch makes the latest JSDOM allow to mock `window.location` in tests.

It also guided in [a blog post about Jest 30](https://jestjs.io/blog/2025/06/04/jest-30#known-issues). He said that Jest may look into providing an alternative to `jsdom` in future, that is better suited for testing. So we hope that this patch will become a temporary workaround.

- https://jestjs.io/blog/2025/06/04/jest-30#known-issues
- https://gist.github.com/cpojer/e66f9a082021a82230f2595a6027f161
