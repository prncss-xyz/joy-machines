import { coreMachineAtom, type Read, type Write } from './coreMachineAtom.ts'
import type { Init } from './utils/init.ts';
import { merge } from './utils/merge.ts'

export function directMachineAtom<E, S extends object, R = S>(
	init: Init<S>,
	events: {
		[K in keyof E]: (
			payload: E[K],
			state: S,
			send: Write,
		) => Partial<S> | null | undefined | void
	},
	result?: (state: S, read: Read) => R,
) {
	return coreMachineAtom<E, S, R>(
		init,
		(e, s, send) => {
			const res = (events as any)[e.type](e.payload, s, send)
			if (res == null) return s
			return merge(s, res)
		},
		result,
	)
}
