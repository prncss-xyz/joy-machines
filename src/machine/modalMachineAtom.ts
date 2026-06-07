import type { WritableAtom } from 'jotai/vanilla'

import type { Tags } from '../tags.ts'
import { type Read, type Write, coreMachineAtom } from './coreMachineAtom.ts'
import type { Init } from './utils/init.ts'

export function modalMachineAtom<Event, State, Result = State>(
	init: Init<Tags<State>>,
	states: {
		[S in keyof State]: Partial<{
			[E in keyof Event]: (
				event: Event[E],
				state: State[S],
				get: Read,
				set: Write,
			) => Tags<State> | null | undefined | void
		}>
	},
	opts?: {
		result?: {
			[S in keyof State]: (state: State[S], get: Read) => Result
		}
		factory?: (
			value: Tags<State>,
		) => WritableAtom<Tags<State>, [Tags<State>], any>
	},
) {
	const { result, factory } = opts ?? {}
	return coreMachineAtom<Event, Tags<State>, Tags<Result>>(
		init,
		(ev, state, get, set) => {
			const s = (states as any)[state.type]
			const handler = s[ev.type]
			if (!handler) return state
			return handler(ev.payload, state.payload, get, set) ?? state
		},
		{
			factory,
			result: result
				? (state, get) => (result as any)[state.type](state.payload, get)
				: undefined,
		},
	)
}
