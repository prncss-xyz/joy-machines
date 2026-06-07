import { collection, type OnMount, type Teardown } from './utils/collection.ts'

type Store<Key> = <Res>(fn: (key: Key, onMount: OnMount) => Res) => Res

function createStoreCollection<Key, Encoded = Store<Key>>() {
	return collection<Key, Store<Key>, Encoded>((key: Key, onMount) => {
		const store = new Map<(key: Key, onMount: OnMount) => any, any>()
		return <Res>(fn: (key: Key, onMount: OnMount) => Res) => {
			if (!store.has(fn)) store.set(fn, fn(key, onMount))
			return store.get(fn) as Res
		}
	})
}

export function createScope<K, Encoded = K>() {
	const store = createStoreCollection<K, Encoded>()
	return <A extends { onMount?: (...args: any[]) => Teardown }>(
		fn: (k: K) => A,
	) => {
		const cb = (k: K, onMount: OnMount) => {
			const a = fn(k)
			a.onMount = onMount
			return a
		}
		return (k: K) => store.get(k)(cb)
	}
}
