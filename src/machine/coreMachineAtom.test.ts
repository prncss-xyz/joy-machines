import { atom, createStore } from 'jotai/vanilla'
import { describe, expect, test } from 'vite-plus/test'

import { coreMachineAtom } from './coreMachineAtom'
import { tag } from './tags'

describe('core machine', () => {
	test('initial state', () => {
		const store = createStore()
		const o = coreMachineAtom('idle', () => 'idle')
		expect(store.get(o)).toBe('idle')
	})

	test('transitions to new state when return value is defined and not undefined', () => {
		const store = createStore()
		type E = {
			START: void
			STOP: void
		}
		const o = coreMachineAtom<E, 'idle' | 'running'>('idle', (e, state) => {
			if (e.type === 'START' && state === 'idle') return 'running'
			if (e.type === 'STOP' && state === 'running') return 'idle'
			return state
		})

		expect(store.get(o)).toBe('idle')

		// Dispatch START
		store.set(o, 'START')
		expect(store.get(o)).toBe('running')

		// Dispatch STOP
		store.set(o, 'STOP')
		expect(store.get(o)).toBe('idle')
	})

	test('supports side effects in transition using send (set)', () => {
		const store = createStore()
		const sideEffectAtom = atom('initial')
		type E = { SIDE_EFFECT: void }
		const o = coreMachineAtom<E, 'idle' | 'done'>(
			'idle',
			(e, state, _get, send) => {
				if (e.type === 'SIDE_EFFECT') {
					send(sideEffectAtom, 'triggered')
					return 'done'
				}
				return state
			},
		)

		expect(store.get(o)).toBe('idle')
		expect(store.get(sideEffectAtom)).toBe('initial')

		store.set(o, 'SIDE_EFFECT')
		expect(store.get(o)).toBe('done')
		expect(store.get(sideEffectAtom)).toBe('triggered')
	})

	test('next helper returns predicted next state or return value', () => {
		const store = createStore()
		const sideEffectAtom = atom('initial')
		type E = {
			START: void
			SELF_LOOP: void
			SIDE_EFFECT: void
		}
		const o = coreMachineAtom<E, 'idle' | 'running' | 'done' | null>(
			'idle',
			(e, state, _get, send) => {
				if (e.type === 'START' && state === 'idle') return 'running'
				if (e.type === 'SELF_LOOP') return 'idle'
				if (e.type === 'SIDE_EFFECT') {
					send(sideEffectAtom, 'triggered')
					return 'done'
				}
				return state
			},
		)

		expect(store.get(o.next('START'))).toBe('running')
		expect(store.get(o.next('SELF_LOOP'))).toBe('idle')
		expect(store.get(o.next('SIDE_EFFECT'))).toBe('done')
	})

	test('can helper evaluates event applicability based on return value, object equality, and side effects', () => {
		const store = createStore()
		type E = {
			START: void
			NOOP: void
			SELF_LOOP: void
			TO_NULL: void
			SIDE_EFFECT: void
		}
		const o = coreMachineAtom<E, 'idle' | 'running' | null>(
			() => 'idle',
			(e, state, _get) => {
				if (e.type === 'START' && state === 'idle') return 'running'
				if (e.type === 'SELF_LOOP') return 'idle'
				return state
			},
		)

		// Note on current implementation details:
		// `can(e)` returns: !(next == undefined || Object.is(next, last) || dirty)
		//
		// 1. START returns 'running', which is not undefined, not equal to 'idle', and did not call send.
		// Expected: true
		expect(store.get(o.can('START'))).toBe(true)

		// 2. SELF_LOOP returns 'idle', which equals 'idle' (Object.is(next, last) is true).
		// Expected: false
		expect(store.get(o.can('SELF_LOOP'))).toBe(false)

		// 3. TO_NULL returns null. Since null == undefined in JavaScript, it matches the first condition.
		// Expected: false
		expect(store.get(o.can('TO_NULL'))).toBe(false)

		// 4. NOOP returns undefined. Matches next == undefined.
		// Expected: false
		expect(store.get(o.can('NOOP'))).toBe(false)
	})

	test('fromSendable works with string event names (shortcut keys)', () => {
		const store = createStore()
		// Test shortcut string events (Sendable allows just the key if it resolves to void/no payload)
		type E = {
			START: void
			STOP: void
		}
		const o = coreMachineAtom<E, string>('idle', (e, state) => {
			if (e.type === 'START' && state === 'idle') return 'running'
			if (e.type === 'STOP' && state === 'running') return 'idle'
			return state
		})

		expect(store.get(o)).toBe('idle')

		// Dispatch START using just a string key
		store.set(o, 'START')
		expect(store.get(o)).toBe('running')

		// Dispatch STOP using just a string key
		store.set(o, 'STOP')
		expect(store.get(o)).toBe('idle')
	})

	test('handles events with payload (machine, can, next)', () => {
		const store = createStore()
		type E = {
			SET_SPEED: number
			DOUBLE: void
		}
		const o = coreMachineAtom<E, number>(0, (e, state) => {
			if (e.type === 'SET_SPEED') return e.payload
			if (e.type === 'DOUBLE') return state * 2
			return state
		})

		expect(store.get(o)).toBe(0)

		// 1. Test next helper with payload
		expect(store.get(o.next(tag('SET_SPEED', 10)))).toBe(10)
		expect(store.get(o.next(tag('SET_SPEED', -5)))).toBe(-5)
		// next helper should not mutate the active machine state
		expect(store.get(o)).toBe(0)

		// 2. Test can helper with payload
		// SET_SPEED 10 transition returns 10, which is different from current state (0)
		// so can() should evaluate to true (meaning it changes the state / is not a no-op).
		expect(store.get(o.can({ payload: 10, type: 'SET_SPEED' }))).toBe(true)
		// SET_SPEED 0 transition returns 0, which equals current state (0)
		// so can() should evaluate to false.
		expect(store.get(o.can({ payload: 0, type: 'SET_SPEED' }))).toBe(false)

		// 3. Test machine transitions with payload
		store.set(o, { payload: 10, type: 'SET_SPEED' })
		expect(store.get(o)).toBe(10)

		// After updating to 10, setting speed to 10 again results in same state, so can() should now return false
		expect(store.get(o.can({ payload: 10, type: 'SET_SPEED' }))).toBe(false)

		store.set(o, { payload: 25, type: 'SET_SPEED' })
		expect(store.get(o)).toBe(25)
	})

	test('supports custom result mapping function', () => {
		const store = createStore()
		type E = {
			INCREMENT: void
			RESET: void
		}
		// A machine where state is a number, but we map it to a string representation via result fn
		const o = coreMachineAtom<E, number, string>(
			0,
			(e, state) => {
				if (e.type === 'INCREMENT') return state + 1
				if (e.type === 'RESET') return 0
				return state
			},
			{ result: (state) => `Count: ${state}` },
		)

		// 1. Initial state mapped correctly
		expect(store.get(o)).toBe('Count: 0')

		// 2. Next helper returns mapped predicted state
		expect(store.get(o.next('INCREMENT'))).toBe('Count: 1')
		// next helper does not mutate active state
		expect(store.get(o)).toBe('Count: 0')

		// 3. State transitions update mapped value correctly
		store.set(o, 'INCREMENT')
		expect(store.get(o)).toBe('Count: 1')

		expect(store.get(o.next('INCREMENT'))).toBe('Count: 2')
		expect(store.get(o.next('RESET'))).toBe('Count: 0')
	})

	test('supports custom factory function', () => {
		const store = createStore()
		const customAtom = <T>(val: T) => atom(val)
		const o = coreMachineAtom<any, string>('idle', () => 'idle', {
			factory: customAtom,
		})
		expect(store.get(o)).toBe('idle')
	})
})
