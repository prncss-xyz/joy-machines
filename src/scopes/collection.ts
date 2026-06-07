import { getHash } from './getHash.ts'

export type Teardown = (() => void) | void
export type OnMount = () => Teardown

const clearCollectionEntriesCallbacks: ((
	filter: (u: unknown) => boolean,
) => void)[] = []
export function clearCollectionEntries(filter: (u: unknown) => boolean) {
	clearCollectionEntriesCallbacks.forEach((clear) => clear(filter))
}

export function collection<Key, Payload, Encoded>(
	factory: (key: Key, onMount: OnMount) => Payload,
	opts?: {
		hydrate?: {
			decode: (value: Encoded, key: Key) => Payload
			values: Iterable<[Key, Encoded]>
		}
		onMount?: OnMount
		ttl?: number
	},
) {
	const ttl = opts?.ttl ?? 0
	type Entry = {
		handle: any
		key: Key
		payload: Payload
	}
	const store = new Map<string, Entry>()
	let count = 0
	let teardown: Teardown = undefined
	if (opts?.hydrate) {
		for (const [key, value] of opts.hydrate.values)
			store.set(getHash(key), {
				handle: 0,
				key,
				payload: opts.hydrate.decode(value, key),
			})
	}
	clearCollectionEntriesCallbacks.push((filter) => {
		store.forEach((entry) => {
			if (filter(entry.key)) store.delete(getHash(entry.key))
		})
	})
	return {
		forEach(callback: (key: Key, payload: Payload) => void) {
			store.forEach((entry) => callback(entry.key, entry.payload))
		},
		get(key: Key) {
			const hash = getHash(key)
			const cached = store.get(hash)
			if (cached) {
				if (cached.handle) {
					clearTimeout(cached.handle)
					cached.handle = 0
				}
				return cached.payload
			}
			const created: Entry = {
				handle: 0,
				key,
				payload: factory(key, () => {
					if (count === 0) teardown = opts?.onMount?.()
					++count
					return () => {
						--count
						void Promise.resolve().then(() => {
							if (count > 0) return
							if (ttl === 0) store.delete(hash)
							teardown?.()
						})
						if (ttl === Infinity || ttl === 0) return
						created.handle = setTimeout(() => store.delete(hash), ttl)
					}
				}),
			}
			store.set(hash, created)
			return created.payload
		},
	}
}
