import { atom, type WritableAtom } from 'jotai/vanilla'
import { fromSendable, type Sendable } from './utils/sendable.ts'
import type { Tags } from './types.ts'
import { fromInit } from './utils/init.ts';

type Send = <Args extends any[]>(
	a: WritableAtom<any, Args, any>,
	...args: Args
) => void

/**
 * @template S - state
 * @template E - event object
 * @param init - initial state
 * @param transition - transition function
 * @returns machine atom
 */
export function choreMachine<S, E>(
	init: S | (() => S),
	transition: (e: Tags<E>, s: S, send: Send) => S | undefined | null | void,
) {
	const state = atom(fromInit(init))
	const machine = atom(
		(get) => get(state),
		(get, set, e: Sendable<E>) => {
			const next = transition(fromSendable(e), get(state), set)
			if (next != undefined) set(state, next)
		},
	)
	const can = (e: Sendable<E>) =>
		atom((get) => {
			let dirty = false
			const last = get(state)
			const next = transition(fromSendable(e), last, () => (dirty = true))
			return next == undefined || Object.is(next, last) || dirty
		})
	const next = (e: Sendable<E>) =>
		atom((get) => transition(fromSendable(e), get(state), () => {}))
	return {
		machine,
		next,
		can,
	}
}
