import { File } from './file'

export const carlo = (() => {
  try {
    // tslint:disable-next-line:no-implicit-dependencies
    return require('carlo')
  } catch (e) {
    return undefined
  }
})()

export abstract class Preview {
  private carlo: any
  readonly file: File

  constructor(file: File) {
    this.file = file
  }

  async open() {
    await this.close()

    this.carlo = await carlo.launch({
      channel: ['canary', 'stable'],
      title: 'Marp CLI',
      args: ['--enable-blink-gen-property-trees'],
    })

    await this.carlo.load(this.file.path)
  }

  async close() {
    if (this.carlo) await this.carlo.exit()
  }

  on(event: string, callback: Function): void {
    if (!this.carlo) throw new Error('Preview window is not yet initialized.')
    this.carlo.on(event, callback)
  }
}

export class FilePreview extends Preview {
  // TODO: Support multiple windows through regular file conversions if Carlo
  // could support to hide main window.
  //
  // @see https://github.com/GoogleChromeLabs/carlo/issues/53
}

export class ServerPreview extends Preview {
  private static encodeURIComponentRFC3986 = url =>
    encodeURIComponent(url).replace(
      /[!'()*]/g,
      c => `%${c.charCodeAt(0).toString(16)}`
    )

  constructor(url: string) {
    const encodedUrl = ServerPreview.encodeURIComponentRFC3986(url)
    const serverFile = `data:text/html,<html><head><meta http-equiv="refresh" content="0;URL='${encodedUrl}'" /></head></html>`

    super(new File(serverFile))
  }
}
