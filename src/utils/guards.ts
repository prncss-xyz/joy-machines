type AnyFunction = (...args: any[]) => any

export function isFunction(u: unknown): u is AnyFunction {
	return typeof u === 'function'
}
