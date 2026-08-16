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

	type Listeners = {
		map: WeakMap<WritableAtom<any, [any], any>, ListenerEntry>
		set: Set<ListenerEntry>
		registry: FinalizationRegistry<ListenerEntry>
	}

	const listenersAtom = atom<Listeners | undefined>(undefined)

	const getListeners = (get: Getter, set: Setter) => {
		const existing = get(listenersAtom)
		if (existing) return existing

		const listeners = {
			map: new WeakMap<WritableAtom<any, [any], any>, ListenerEntry>(),
			registry: undefined as never as FinalizationRegistry<ListenerEntry>,
			set: new Set<ListenerEntry>(),
		}
		listeners.registry = new FinalizationRegistry((entry) =>
			listeners.set.delete(entry),
		)
		set(listenersAtom, listeners)
		return listeners
	}

	const listenAtom = atom(
		null,
		(
			get: Getter,
			set: Setter,
			a: WritableAtom<any, [any], any>,
			fn: (message: M) => any = id,
		) => {
			const listeners = getListeners(get, set)
			const existing = listeners.map.get(a)
			if (existing) {
				existing.fn = fn
			} else {
				const entry: ListenerEntry = {
					fn,
					ref: new WeakRef(a),
				}
				listeners.map.set(a, entry)
				listeners.set.add(entry)
				listeners.registry.register(a, entry)
			}
		},
	)

	const subjectAtom = atom(null, (get, set, message: M) => {
		const listeners = getListeners(get, set)
		let pristine = true
		for (const entry of listeners.set) {
			const a = entry.ref.deref()
			if (a) {
				set(a, entry.fn(message))
				pristine = false
			} else listeners.set.delete(entry)
		}
		if (pristine) onNoListeners(get, set, message)
	})

	return [listenAtom, subjectAtom] as const
}
