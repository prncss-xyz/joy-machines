import type { Getter, WritableAtom } from 'jotai/vanilla'

import { type RestrictedSetter, coreMachineAtom } from './coreMachineAtom'
import type { Init } from './utils/init'
import { merge } from './utils/merge'

export function directMachineAtom<E, S extends object, R = S>(
	init: Init<S>,
	events: {
		[K in keyof E]: (
			payload: E[K],
			state: S,
			get: Getter,
			set: RestrictedSetter,
		) => Partial<S> | null | undefined | void
	},
	opts?: {
		result?: (state: S, read: Getter) => R
		factory?: (value: S) => WritableAtom<S, [S], any>
	},
) {
	return coreMachineAtom<E, S, R>(
		init,
		(e, s, get, set) => {
			const res = (events as any)[e.type](e.payload, s, get, set)
			if (res == null) return s
			return merge(s, res)
		},
		opts,
	)
}
