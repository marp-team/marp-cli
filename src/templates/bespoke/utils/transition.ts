export interface ResolveAnimationOptions {
  type: 'incoming' | 'outgoing'
  backward?: boolean
  duration?: string
}

export interface MarpTransitionData {
  name: string
  duration?: string
  builtinFallback?: boolean
}

export interface MarpTransitionKeyframeSettings {
  name: string
  defaultDuration?: string
}

export type MarpTransitionResolvableKeyframeSettings = Omit<
  MarpTransitionKeyframeSettings,
  'name'
>

export type MarpTransitionKeyframes = Record<
  keyof typeof directions,
  Record<keyof typeof types, MarpTransitionKeyframeSettings | undefined>
>

export const _resetResolvedKeyframes = () => {
  resolvedMarpTransitionKeyframes.clear()
  resolvedMarpTransitionKeyframes.set('none', {
    backward: { both: undefined, incoming: undefined, outgoing: undefined },
    forward: { both: undefined, incoming: undefined, outgoing: undefined },
  })
}

export const _testElementAnimation = (
  elm: HTMLElement,
  callback: (ret: MarpTransitionResolvableKeyframeSettings | undefined) => void
) => {
  /* c8 ignore start */
  requestAnimationFrame(() => {
    elm.style.animationPlayState = 'running'
    requestAnimationFrame(() => callback(undefined))
  })
  /* c8 ignore stop */
}

const resolvedMarpTransitionKeyframes = new Map<
  string,
  MarpTransitionKeyframes
>()
_resetResolvedKeyframes()

const types = {
  both: '',
  outgoing: 'outgoing-',
  incoming: 'incoming-',
} as const

const directions = { forward: '', backward: '-backward' } as const

const animCSSVar = <T extends string>(key: T) =>
  `--marp-bespoke-transition-animation-${key}` as const

const publicCSSVar = <T extends string>(key: T) =>
  `--marp-transition-${key}` as const

const nameCSSVar = animCSSVar('name')
const durationCSSVar = animCSSVar('duration')

const resolveKeyframeSetting = (keyframe: string) =>
  new Promise<MarpTransitionResolvableKeyframeSettings | undefined>((res) => {
    const setting: MarpTransitionResolvableKeyframeSettings = {}

    const elm = document.createElement('div')
    const resolve = (
      ret: MarpTransitionResolvableKeyframeSettings | undefined
    ) => {
      elm.remove()
      res(ret)
    }
    elm.addEventListener('animationstart', () => resolve(setting))

    Object.assign(elm.style, {
      animationName: keyframe,
      animationDuration: '1s',
      animationFillMode: 'both',
      animationPlayState: 'paused',
      position: 'absolute',
      pointerEvents: 'none',
    })

    document.body.appendChild(elm)

    // Detect default duration for the current animation keyframe.
    const currentStyle = getComputedStyle(elm)
    const durationVar = currentStyle.getPropertyValue(publicCSSVar('duration'))

    if (durationVar) {
      setting.defaultDuration = durationVar
    }
    // TODO: Consider to abuse animatable property with custom-ident if View
    // Transition API had supported in cross-browser and `@property` CSS at-rule
    // was not yet supported in other browsers well
    //
    // else if (
    //   // CSS variable that is setting within the keyframe cannot read in some
    //   // browsers (Firefox, Safari). So Marp abuses grid-row-start property
    //   // in "from" keyframe as a custom value.
    //   currentStyle.gridRowStart.startsWith('marp-transition-duration-')
    // ) {
    //   setting.defaultDuration = currentStyle.gridRowStart
    //     .slice(25)
    //     .replace(/\\./g, '.')
    // }

    _testElementAnimation(elm, resolve)
  })

const resolveMarpTransitionKeyframes = (transitionName: string) => {
  const ret: MarpTransitionKeyframes = {} as unknown as MarpTransitionKeyframes
  const promises: Promise<void>[] = []

  for (const [type, typePrefix] of Object.entries(types))
    for (const [direction, directionSuffix] of Object.entries(directions)) {
      const keyframe = `marp-${typePrefix}transition${directionSuffix}-${transitionName}`
      promises.push(
        resolveKeyframeSetting(keyframe).then((setting) => {
          ret[direction] = ret[direction] || {}
          ret[direction][type] = setting
            ? { ...setting, name: keyframe }
            : undefined
        })
      )
    }

  return Promise.all(promises).then(() => ret)
}

const fetchMarpTransitionKeyframes = async (
  transitionName: string
): Promise<Readonly<MarpTransitionKeyframes>> => {
  if (!resolvedMarpTransitionKeyframes.has(transitionName)) {
    return resolveMarpTransitionKeyframes(transitionName).then((resolved) => {
      resolvedMarpTransitionKeyframes.set(transitionName, resolved)
      return resolved
    })
  }
   
  return resolvedMarpTransitionKeyframes.get(transitionName)!
}

export const getMarpTransitionKeyframes = async (
  transitionName: string,
  { builtinFallback = true }: { builtinFallback?: boolean } = {}
): Promise<Readonly<MarpTransitionKeyframes> | undefined> => {
  let keyframes = await fetchMarpTransitionKeyframes(transitionName)

  // Fallback to builtin keyframes
  if (isMarpTransitionKeyframesEmpty(keyframes)) {
    if (!builtinFallback) return undefined

    keyframes = await fetchMarpTransitionKeyframes(
      `__builtin__${transitionName}`
    )
    return isMarpTransitionKeyframesEmpty(keyframes) ? undefined : keyframes
  }

  return keyframes
}

export const isMarpTransitionKeyframesEmpty = (
  keyframes: MarpTransitionKeyframes
) =>
  Object.values(keyframes)
    .flatMap(Object.values)
    .every((v) => !v)

export const prepareMarpTransitions = (...transitionNames: string[]) => {
  const names = [...new Set(transitionNames).values()]

  return Promise.all(
    names.map((name) => fetchMarpTransitionKeyframes(name))
  ).then<void>()
}

type AnimationVariables = Record<ReturnType<typeof animCSSVar>, string>

const resolveAnimationVariables = (
  keyframes: MarpTransitionKeyframes,
  { type, backward }: ResolveAnimationOptions
): AnimationVariables => {
  const target = keyframes[backward ? 'backward' : 'forward']
  const resolved = (() => {
    const detailedKeyframe = target[type]

    const resolveStyle = (
      kf: MarpTransitionKeyframeSettings
    ): AnimationVariables => ({ [nameCSSVar]: kf.name })

    if (detailedKeyframe) {
      return resolveStyle(detailedKeyframe)
    } else if (target.both) {
      const style = resolveStyle(target.both)
      if (type === 'incoming') style[animCSSVar('direction')] = 'reverse'

      return style
    }

    return undefined
  })()

  if (!resolved && backward)
    return resolveAnimationVariables(keyframes, { type, backward: false })

  return (
    resolved || { [nameCSSVar]: '__bespoke_marp_transition_no_animation__' }
  )
}

export const resolveAnimationStyles = (
  keyframes: MarpTransitionKeyframes,
  opts: Omit<ResolveAnimationOptions, 'type'>
): readonly string[] => {
  const rules: string[] = [
    `:root{${publicCSSVar('direction')}:${opts.backward ? -1 : 1};}`,

    // For marp-bespoke-bespoke-inactive plugin
    ':root:has(.bespoke-marp-inactive){cursor:none;}',
  ]

  const resolveDefaultDuration = (
    direction: keyof typeof directions
  ): string | undefined => {
    const ret =
      keyframes[direction].both?.defaultDuration ||
      keyframes[direction].outgoing?.defaultDuration ||
      keyframes[direction].incoming?.defaultDuration

    if (direction === 'forward') return ret

    // Fallback to forward duration
    return ret || resolveDefaultDuration('forward')
  }

  const duration =
    opts.duration ||
    resolveDefaultDuration(opts.backward ? 'backward' : 'forward')

  if (duration !== undefined) {
    rules.push(`::view-transition-group(*){${durationCSSVar}:${duration};}`)
  }

  const getStyleMap = (vars: ReturnType<typeof resolveAnimationVariables>) =>
    Object.entries(vars)
      .map(([k, v]) => `${k}:${v};`)
      .join('')

  rules.push(
    `::view-transition-old(root){${getStyleMap(
      resolveAnimationVariables(keyframes, { ...opts, type: 'outgoing' })
    )}}`,
    `::view-transition-new(root){${getStyleMap(
      resolveAnimationVariables(keyframes, { ...opts, type: 'incoming' })
    )}}`
  )

  return rules
}

export const isTransitionData = (data: unknown): data is MarpTransitionData => {
  if (typeof data !== 'object') return false
  const transitionData = data as MarpTransitionData

  return (
    typeof transitionData.name === 'string' &&
    (typeof transitionData.duration === 'undefined' ||
      typeof transitionData.duration === 'string')
  )
}

export const parseTransitionData = (rawJSON: string | undefined) => {
  if (rawJSON) {
    try {
      const json = JSON.parse(rawJSON)
      if (isTransitionData(json)) return json
    } catch (_) {
      /* fault tolerance */
    }
  }
  return undefined
}
