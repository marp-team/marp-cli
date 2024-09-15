import type { Marp } from '@marp-team/marp-core'
import type { Marpit } from '@marp-team/marpit'
import type { IMarpCLIConfig } from './config'
import type { ResolvableEngine } from './engine'

import { apiInterface } from './marp-cli'

type Overwrite<T, U> = Omit<T, Extract<keyof T, keyof U>> & U

export { ObservationHelper, waitForObservation } from './marp-cli'
export { CLIError, CLIErrorCode } from './error'

export const marpCli = apiInterface
export default apiInterface

// ---

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Config<Engine extends typeof Marpit = typeof Marp>
  extends Overwrite<
    Omit<
      IMarpCLIConfig,
      /**
       * This option is internal setting for collaboration with Marp team tools such as Marp for VS Code.
       * It is not designed for users because the result of conversion may break if set wrong base URL.
       */
      'baseUrl'
    >,
    {
      engine?: ResolvableEngine<Engine>
      image?: 'png' | 'jpeg'
      images?: 'png' | 'jpeg'
      options?: ConstructorParameters<Engine>[0]
    }
  > {}

export const defineConfig = <Engine extends typeof Marpit = typeof Marp>(
  config: Config<Engine>
) => config
