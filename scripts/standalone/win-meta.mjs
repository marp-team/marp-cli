import fs from 'node:fs/promises'
import path from 'node:path'
import * as ResEdit from 'resedit'
import packageJson from '../../package.json' with { type: 'json' }
import { root } from './utils/path.mjs'

const lang = 1033 // en-US
const codepage = 1200 // Unicode

const { author, description, version } = packageJson
const vParts = /^(\d+)\.(\d+)\.(\d+)/.exec(version)
const [, major, minor, patch] = vParts.map((i) => Number.parseInt(i, 10))

export const updateWindowsMetadata = async (bin) => {
  const exe = ResEdit.NtExecutable.from(await fs.readFile(bin), {
    ignoreCert: true,
  })
  const resource = ResEdit.NtExecutableResource.from(exe)

  // Version info
  const [vi] = ResEdit.Resource.VersionInfo.fromEntries(resource.entries)

  vi.setFileVersion(major, minor, patch, 0, lang)
  vi.setProductVersion(major, minor, patch, 0, lang)
  vi.setStringValues(
    { lang, codepage },
    {
      CompanyName: author.name,
      FileDescription: description,
      FileVersion: version,
      InternalName: 'marp',
      LegalCopyright: `Copyright \u00a9 ${author.name}`,
      OriginalFilename: 'marp.exe',
      ProductName: 'Marp CLI',
      ProductVersion: version,
      Comments: `Built with Node.js ${process.versions.node}`,
    }
  )

  vi.outputToResourceEntries(resource.entries)

  // Icon
  const [iconGroup] = ResEdit.Resource.IconGroupEntry.fromEntries(
    resource.entries
  )

  const iconFile = ResEdit.Data.IconFile.from(
    await fs.readFile(path.join(root, 'src/assets/win-icon.ico'))
  )
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
    resource.entries,
    iconGroup.id,
    iconGroup.lang,
    iconFile.icons.map((icon) => icon.data)
  )

  resource.outputResource(exe)

  await fs.writeFile(bin, Buffer.from(exe.generate()))
}
