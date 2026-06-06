import { isFunction } from './guards.ts'

export type Init<Res, Args extends any[] = []> = ((...args: Args) => Res) | Res

export function fromInit<Res>(init: Res | (() => Res)): Res {
	return isFunction(init) ? init() : init
}
