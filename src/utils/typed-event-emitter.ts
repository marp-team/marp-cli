import { EventEmitter } from 'events'

type Events<T> = Extract<keyof T, string | symbol>

export default class TypedEventEmitter<
  T extends { [event in Events<T>]: (...args: any[]) => void }
> extends EventEmitter {
  addListener!: <E extends Events<T>>(event: E, listener: T[E]) => this
  on!: <E extends Events<T>>(event: E, listener: T[E]) => this
  once!: <E extends Events<T>>(event: E, listener: T[E]) => this
  prependListener!: <E extends Events<T>>(event: E, listener: T[E]) => this
  prependOnceListener!: <E extends Events<T>>(event: E, listener: T[E]) => this
  removeListener!: <E extends Events<T>>(event: E, listener: T[E]) => this
  off!: <E extends Events<T>>(event: E, listener: T[E]) => this
  removeAllListeners!: (event?: Events<T>) => this
  listeners!: (event: Events<T>) => Function[]
  rawListeners!: (event: Events<T>) => Function[]
  emit!: <E extends Events<T>, F extends T[E]>(
    event: E,
    ...args: F extends (...args: infer R) => any ? R : never
  ) => boolean
  eventNames!: () => Events<T>[]
  listenerCount!: (type: Events<T>) => number
}
