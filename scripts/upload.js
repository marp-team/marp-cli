/* Upload packed binaries to GitHub Release. */

const Octokit = require('@octokit/rest')
const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const { version } = require('../package.json')

const dist = path.resolve(__dirname, '../dist')
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
})

const repo = { owner: 'marp-team', repo: 'marp-cli' }
const tag = `v${version}`

;(async () => {
  // Get release from version tag
  const { data } = await octokit.repos.getReleaseByTag({ ...repo, tag })

  // Upload assets
  for (const fn of await promisify(fs.readdir)(dist)) {
    const file = path.resolve(dist, fn)
    const stat = await promisify(fs.stat)(file)

    if (stat.isFile) {
      console.info(`Uploading ${fn} to ${tag} release...`)

      await octokit.repos.uploadReleaseAsset({
        file: fs.createReadStream(file),
        headers: {
          'content-type': (() => {
            if (fn.endsWith('.tar.gz')) return 'application/gzip'
            if (fn.endsWith('.zip')) return 'application/zip'

            return 'application/octet-stream'
          })(),
          'content-length': stat.size,
        },
        name: fn,
        url: data.upload_url,
      })
    }
  }
})()
