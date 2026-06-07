export type Init<T> = T | (() => T)
type AnyFunction = (...args: any[]) => any

function isFunction(u: unknown): u is AnyFunction {
	return typeof u === 'function'
}

export function fromInit<Res>(init: Res | (() => Res)): Res {
	return isFunction(init) ? init() : init
}
