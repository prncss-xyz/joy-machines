import { atom, type Getter, type Setter, type WritableAtom } from 'jotai'

import { id } from '@/utils/id'
import { noop } from '@/utils/noop'

export function createSubject<M>(
	onNoListeners: (get: Getter, set: Setter, message: M) => void = noop,
) {
	type ListenerEntry = {
		ref: WeakRef<WritableAtom<any, [any], any>>
		fn: (message: M) => any
	}

	const listenersMap = new WeakMap<
		WritableAtom<any, [any], any>,
		ListenerEntry
	>()
	const listenersSet = new Set<ListenerEntry>()

	const registry = new FinalizationRegistry<ListenerEntry>((entry) => {
		listenersSet.delete(entry)
	})

	function listen<A = M>(
		a: WritableAtom<any, [A], any>,
		fn: (message: M) => A = id as never,
	) {
		const existing = listenersMap.get(a)
		if (existing) {
			existing.fn = fn
		} else {
			const entry: ListenerEntry = {
				fn,
				ref: new WeakRef(a),
			}
			listenersMap.set(a, entry)
			listenersSet.add(entry)
			registry.register(a, entry)
		}
	}

	const subject = atom<never, [M], void>(0 as never, (get, set, message) => {
		let pristine = true
		for (const entry of listenersSet) {
			const a = entry.ref.deref()
			if (a) {
				set(a, entry.fn(message))
				pristine = false
			} else listenersSet.delete(entry)
		}
		if (pristine) onNoListeners(get, set, message)
	})

	return [listen, subject] as const
}
