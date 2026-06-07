import { coreMachineAtom, type Write } from './coreMachineAtom.ts'
import type { Init } from './utils/init.ts'
import type { Tags } from './utils/tags.ts';

export function modalMachineAtom<Event, State, Result = State>(
	init: Init<Tags<State>>,
	states: {
		[S in keyof State]: Partial<{
			[E in keyof Event]: (
				event: Event[E],
				state: State[S],
				send: Write,
			) => Tags<State> | null | undefined | void
		}>
	},
	result?: {
		[S in keyof State]: (state: State[S]) => Result
	},
) {
	return coreMachineAtom<Event, Tags<State>, Tags<Result>>(
		init,
		(ev, state, send) => {
			const s = (states as any)[state.type]
			const handler = s[ev.type]
			if (!handler) return state
			return handler(ev.payload, state.payload, send) ?? state
		},
		result ? (state) => (result as any)[state.type](state.payload) : undefined,
	)
}
