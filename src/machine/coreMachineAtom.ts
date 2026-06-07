import { type Atom, type WritableAtom, atom } from 'jotai/vanilla'

import { id } from '../utils/id.ts'
import { type Init, fromInit } from '../utils/init.ts'
import { type Sendable, fromSendable } from './sendable.ts'
import type { Tags } from '../tags.ts'

// this is a restricted version of Jotai's
export type Write = <Args extends any[]>(
	a: WritableAtom<any, Args, any>,
	...args: Args
) => void

export type Read = <Value>(atom: Atom<Value>) => Value

/**
 * @template E - event object
 * @template S - state
 * @template R - result
 * @param init - initial state
 * @param transition - transition function
 * @param result - optional result function
 * @returns machine atom
 */
export function coreMachineAtom<E, S, R = S>(
	init: Init<S>,
	transition: (
		e: Tags<E>,
		s: S,
		read: Read,
		write: Write,
	) => S | undefined | null | void,
	result: (s: S, read: Read) => R = id as never,
): WritableAtom<R, [e: Sendable<E>], void> & {
	next: (e: Sendable<E>) => Atom<R>
	disabled: (e: Sendable<E>) => Atom<boolean>
} {
	const state = atom(fromInit(init))
	const machine: any = atom(
		(get) => result(get(state), get),
		(get, set, e: Sendable<E>) => {
			const next = transition(fromSendable(e), get(state), get, set)
			if (next != undefined) set(state, next)
		},
	)
	machine.disabled = (e: Sendable<E>) =>
		atom((get) => {
			let dirty = false
			const last = get(state)
			const next = transition(fromSendable(e), last, get, () => (dirty = true))
			return !(next == undefined || Object.is(next, last) || dirty)
		})
	machine.next = (e: Sendable<E>) =>
		atom((get) => {
			const s = get(state)
			const n = transition(fromSendable(e), s, get, () => {}) ?? s
			return result(n, get)
		})
	return machine
}
