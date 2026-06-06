import { atom, type WritableAtom } from 'jotai/vanilla'
import { fromSendable, type Sendable } from './utils/sendable.ts'
import type { Tags } from './types.ts'
import { fromInit } from './utils/init.ts'
import { id } from './utils/id.ts'

type Send = <Args extends any[]>(
	a: WritableAtom<any, Args, any>,
	...args: Args
) => void

/**
 * @template E - event object
 * @template S - state
 * @template R - result
 * @param init - initial state
 * @param transition - transition function
 * @param result - optional result function
 * @returns machine atom
 */
export function choreMachine<E, S, R = S>(
	init: S | (() => S),
	transition: (e: Tags<E>, s: S, send: Send) => S | undefined | null | void,
	result: (s: S) => R = id as never,
) {
	const state = atom(fromInit(init))
	const machine = atom(
		(get) => result(get(state)),
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
		atom((get) => {
			const s = get(state)
			const n = transition(fromSendable(e), s, () => {}) ?? s
			return result(n)
		})
	return {
		machine,
		next,
		can,
	}
}
