import { type Read, type Write, coreMachineAtom } from './coreMachineAtom.ts'
import type { Init } from '../utils/init.ts'
import { merge } from './merge.ts'

export function directMachineAtom<E, S extends object, R = S>(
	init: Init<S>,
	events: {
		[K in keyof E]: (
			payload: E[K],
			state: S,
			get: Read,
			set: Write,
		) => Partial<S> | null | undefined | void
	},
	result?: (state: S, read: Read) => R,
) {
	return coreMachineAtom<E, S, R>(
		init,
		(e, s, get, set) => {
			const res = (events as any)[e.type](e.payload, s, get, set)
			if (res == null) return s
			return merge(s, res)
		},
		result,
	)
}
