import { cached } from '../utils/cached.ts'
import { collection, type OnMount, type Teardown } from './utils/collection.ts'

type Store<Key> = <Res>(fn: (key: Key, onMount: OnMount) => Res) => Res

function createStoreCollection<Key, Encoded = Store<Key>>() {
	return collection<Key, Store<Key>, Encoded>((key: Key, onMount) =>
		cached((fn: (key: Key, onMount: OnMount) => any) => fn(key, onMount)),
	)
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
