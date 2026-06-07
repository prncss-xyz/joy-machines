import { type Atom, type WritableAtom, atom } from 'jotai/vanilla'

import type { Tags } from '../tags.ts'
import { id } from '../utils/id.ts'
import { type Init, fromInit } from '../utils/init.ts'
import { noop } from '../utils/noop.ts'
import { type Sendable, fromSendable } from './sendable.ts'

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
	transition: (e: Tags<E>, s: S, read: Read, write: Write) => S,
	opts?: {
		result?: (s: S, read: Read) => R
		factory?: (value: S) => WritableAtom<S, [S], any>
	},
): WritableAtom<R, [e: Sendable<E>], void> & {
	next: (e: Sendable<E>) => Atom<R>
	can: (e: Sendable<E>) => Atom<boolean>
} {
	const { result = id as never, factory = atom<S> } = opts ?? {}
	const state = factory(fromInit(init))
	const machine: any = atom(
		(get) => result(get(state), get),
		(get, set, e: Sendable<E>) =>
			set(state, transition(fromSendable(e), get(state), get, set)),
	)
	machine.can = (e: Sendable<E>) =>
		atom((get) => {
			let dirty = false
			const last = get(state)
			const next = transition(fromSendable(e), last, get, () => (dirty = true))
			return dirty || !Object.is(next, last)
		})
	machine.next = (e: Sendable<E>) =>
		atom((get) =>
			result(transition(fromSendable(e), get(state), get, noop), get),
		)
	return machine
}
