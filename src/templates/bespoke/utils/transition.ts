export type ResolveAnimationOptions = {
  type: 'incoming' | 'outgoing'
  backward?: boolean
  duration?: string
}

export type MarpTransitionData = {
  name: string
  duration?: string
  builtinFallback?: boolean
}

export type MarpTransitionKeyframes = Record<
  keyof typeof directions,
  Record<keyof typeof types, string | undefined>
>

export const _resetResolvedKeyframes = () => {
  resolvedMarpTransitionKeyframes.clear()
  resolvedMarpTransitionKeyframes.set('none', {
    backward: { both: undefined, incoming: undefined, outgoing: undefined },
    forward: { both: undefined, incoming: undefined, outgoing: undefined },
  })
}

export const _testElementAnimation = (
  _element: HTMLElement,
  callback: (ret: boolean) => void
) => {
  /* istanbul ignore next */
  requestAnimationFrame(() => requestAnimationFrame(() => callback(false)))
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

const isAvailableKeyframe = (keyframe: string) =>
  new Promise<boolean>((res) => {
    const elm = document.createElement('div')
    const resolve = (ret: boolean) => {
      elm.remove()
      res(ret)
    }
    elm.addEventListener('animationstart', () => resolve(true))

    Object.assign(elm.style, {
      animationName: keyframe,
      animationDuration: '1s',
      animationFillMode: 'both',
      position: 'absolute',
      pointerEvents: 'none',
    })

    document.body.appendChild(elm)
    _testElementAnimation(elm, resolve)
  })

const resolveMarpTransitionKeyframes = (transitionName: string) => {
  const ret: MarpTransitionKeyframes = {} as unknown as MarpTransitionKeyframes
  const promises: Promise<void>[] = []

  for (const [type, typePrefix] of Object.entries(types))
    for (const [direction, directionSuffix] of Object.entries(directions)) {
      const keyframe = `marp-${typePrefix}transition${directionSuffix}-${transitionName}`
      promises.push(
        isAvailableKeyframe(keyframe).then((available) => {
          ret[direction] = ret[direction] || {}
          ret[direction][type] = available ? keyframe : undefined
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
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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

const resolveAnimationVariables = (
  keyframes: MarpTransitionKeyframes,
  { type, backward, duration }: ResolveAnimationOptions
): Record<ReturnType<typeof animCSSVar>, string> => {
  const target = keyframes[backward ? 'backward' : 'forward']
  const resolved = (() => {
    const detailedKeyframe = target[type]

    if (typeof detailedKeyframe === 'string') {
      return { [nameCSSVar]: detailedKeyframe } as const
    } else if (target.both) {
      const style = { [nameCSSVar]: target.both } as const

      return type === 'incoming'
        ? ({ ...style, [animCSSVar('direction')]: 'reverse' } as const)
        : style
    }

    return undefined
  })()

  if (!resolved && backward)
    return resolveAnimationVariables(keyframes, {
      type,
      duration,
      backward: false,
    })

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
  ]

  if (opts.duration !== undefined) {
    rules.push(
      `::page-transition-container(*){${durationCSSVar}:${opts.duration};}`
    )
  }

  const getStyleMap = (vars: ReturnType<typeof resolveAnimationVariables>) =>
    Object.entries(vars)
      .map(([k, v]) => `${k}:${v};`)
      .join('')

  rules.push(
    `::page-transition-outgoing-image(root){${getStyleMap(
      resolveAnimationVariables(keyframes, { ...opts, type: 'outgoing' })
    )}}`,
    `::page-transition-incoming-image(root){${getStyleMap(
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
