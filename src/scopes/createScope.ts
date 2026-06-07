import { collection, type OnMount } from './collection.ts'

function scope<Key>() {
	return collection((key: Key, onMount) => {
		const store = new Map<(key: Key, onMount: OnMount) => any, any>()
		return <Res>(fn: (key: Key, onMount: OnMount) => Res) => {
			if (!store.has(fn)) store.set(fn, fn(key, onMount))
			return store.get(fn) as Res
		}
	})
}

export function createScope<K>() {
	const s = scope<K>()
	return <A extends { onMount?: (...args: any[]) => (() => void) | void }>(
		fn: (k: K) => A,
	) => {
		const cb = (k: K, onMount: () => void) => {
			const a = fn(k)
			a.onMount = onMount
			return a
		}
		return (k: K) => s.get(k)(cb)
	}
}
