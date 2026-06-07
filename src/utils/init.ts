import { isFunction } from './guards.ts'

export type Init<T> = T | (() => T)

export function fromInit<Res>(init: Res | (() => Res)): Res {
	return isFunction(init) ? init() : init
}
