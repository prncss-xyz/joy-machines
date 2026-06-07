export function cached<K, V, Args extends any[]>(
	fn: (k: K, ...args: Args) => V,
) {
	const cache = new Map<K, V>()
	return (k: K, ...args: Args) => {
		if (!cache.has(k)) cache.set(k, fn(k, ...args))
		return cache.get(k) as V
	}
}
