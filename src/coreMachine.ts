import { atom, type WritableAtom, type Atom } from 'jotai/vanilla'
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
export function coreMachine<E, S, R = S>(
	init: S | (() => S),
	transition: (e: Tags<E>, s: S, send: Send) => S | undefined | null | void,
	result: (s: S) => R = id as never,
): WritableAtom<R, [e: Sendable<E>], void> & {
	next: (e: Sendable<E>) => Atom<R>
	disabled: (e: Sendable<E>)  => Atom<boolean>
} {
	const state = atom(fromInit(init))
	const machine: any = atom(
		(get) => result(get(state)),
		(get, set, e: Sendable<E>) => {
			const next = transition(fromSendable(e), get(state), set)
			if (next != undefined) set(state, next)
		},
	)
	machine.disabled = (e: Sendable<E>) =>
		atom((get) => {
			let dirty = false
			const last = get(state)
			const next = transition(fromSendable(e), last, () => (dirty = true))
			return !(next == undefined || Object.is(next, last) || dirty)
		})
	machine.next = (e: Sendable<E>) =>
		atom((get) => {
			const s = get(state)
			const n = transition(fromSendable(e), s, () => {}) ?? s
			return result(n)
		})
	return machine
}
