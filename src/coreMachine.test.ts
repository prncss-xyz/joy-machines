import { atom, createStore } from 'jotai/vanilla'
import { describe, test, expect } from 'vite-plus/test'
import { coreMachine } from './coreMachine.ts'

describe('core machine', () => {
	test('initial state', () => {
		const store = createStore()
		const o = coreMachine('idle', () => {})
		expect(store.get(o)).toBe('idle')
	})

	test('transitions to new state when return value is defined and not undefined', () => {
		const store = createStore()
		type Events = {
			START: void
			STOP: void
		}
		const o = coreMachine<Events, 'idle' | 'running'>('idle', (e, state) => {
			if (e.type === 'START' && state === 'idle') return 'running'
			if (e.type === 'STOP' && state === 'running') return 'idle'
		})

		expect(store.get(o)).toBe('idle')

		// Dispatch START
		store.set(o, 'START')
		expect(store.get(o)).toBe('running')

		// Dispatch STOP
		store.set(o, 'STOP')
		expect(store.get(o)).toBe('idle')
	})

	test('does not transition when return value is undefined', () => {
		const store = createStore()
		type Events = { NOOP: void }
		const o = coreMachine<Events, 'idle'>('idle', (e) => {
			if (e.type === 'NOOP') return undefined
		})

		expect(store.get(o)).toBe('idle')
		store.set(o, 'NOOP')
		expect(store.get(o)).toBe('idle')
	})

	test('does not transition when return value is null (due to loose equality check in implementation)', () => {
		const store = createStore()
		type Events = { TO_NULL: void }
		const o = coreMachine<Events, 'idle' | null>('idle', (e) => {
			if (e.type === 'TO_NULL') return null
		})

		expect(store.get(o)).toBe('idle')
		store.set(o, 'TO_NULL')
		// Loose equality check (next != undefined) means null is treated like undefined
		expect(store.get(o)).toBe('idle')
	})

	test('supports side effects in transition using send (set)', () => {
		const store = createStore()
		const sideEffectAtom = atom('initial')
		type Events = { SIDE_EFFECT: void }
		const o = coreMachine<Events, 'idle' | 'done'>(
			'idle',
			(e, _state, send) => {
				if (e.type === 'SIDE_EFFECT') {
					send(sideEffectAtom, 'triggered')
					return 'done'
				}
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
		type Events = {
			START: void
			NOOP: void
			TO_NULL: void
			SELF_LOOP: void
			SIDE_EFFECT: void
		}
		const o = coreMachine<Events, 'idle' | 'running' | 'done' | null>(
			'idle',
			(e, state, send) => {
				if (e.type === 'START' && state === 'idle') return 'running'
				if (e.type === 'SELF_LOOP') return 'idle'
				if (e.type === 'TO_NULL') return null
				if (e.type === 'NOOP') return undefined
				if (e.type === 'SIDE_EFFECT') {
					send(sideEffectAtom, 'triggered')
					return 'done'
				}
			},
		)

		expect(store.get(o.next('START'))).toBe('running')
		expect(store.get(o.next('SELF_LOOP'))).toBe('idle')
		expect(store.get(o.next('TO_NULL'))).toBe('idle')
		expect(store.get(o.next('NOOP'))).toBe('idle')
		expect(store.get(o.next('SIDE_EFFECT'))).toBe('done')
	})

	test('disabled helper evaluates event applicability based on return value, object equality, and side effects', () => {
		const store = createStore()
		const sideEffectAtom = atom('initial')
		type Events = {
			START: void
			NOOP: void
			SELF_LOOP: void
			TO_NULL: void
			SIDE_EFFECT: void
		}
		const o = coreMachine<Events, 'idle' | 'running' | null>(
			() => 'idle',
			(e, state, send) => {
				if (e.type === 'START' && state === 'idle') return 'running'
				if (e.type === 'SELF_LOOP') return 'idle'
				if (e.type === 'TO_NULL') return null
				if (e.type === 'NOOP') return undefined
				if (e.type === 'SIDE_EFFECT') {
					send(sideEffectAtom, 'triggered')
					return undefined
				}
			},
		)

		// Note on current implementation details:
		// `disabled(e)` returns: !(next == undefined || Object.is(next, last) || dirty)
		//
		// 1. START returns 'running', which is not undefined, not equal to 'idle', and did not call send.
		// Expected: true
		expect(store.get(o.disabled('START'))).toBe(true)

		// 2. SELF_LOOP returns 'idle', which equals 'idle' (Object.is(next, last) is true).
		// Expected: false
		expect(store.get(o.disabled('SELF_LOOP'))).toBe(false)

		// 3. TO_NULL returns null. Since null == undefined in JavaScript, it matches the first condition.
		// Expected: false
		expect(store.get(o.disabled('TO_NULL'))).toBe(false)

		// 4. NOOP returns undefined. Matches next == undefined.
		// Expected: false
		expect(store.get(o.disabled('NOOP'))).toBe(false)

		// 5. SIDE_EFFECT returns undefined (next == undefined) and triggers send (dirty = true).
		// Expected: false
		expect(store.get(o.disabled('SIDE_EFFECT'))).toBe(false)
	})

	test('fromSendable works with string event names (shortcut keys)', () => {
		const store = createStore()
		// Test shortcut string events (Sendable allows just the key if it resolves to void/no payload)
		type Events = {
			START: void
			STOP: void
		}
		const o = coreMachine<Events, string>('idle', (e, state) => {
			if (e.type === 'START' && state === 'idle') return 'running'
			if (e.type === 'STOP' && state === 'running') return 'idle'
		})

		expect(store.get(o)).toBe('idle')

		// Dispatch START using just a string key
		store.set(o, 'START')
		expect(store.get(o)).toBe('running')

		// Dispatch STOP using just a string key
		store.set(o, 'STOP')
		expect(store.get(o)).toBe('idle')
	})

	test('handles events with payload (machine, disabled, next)', () => {
		const store = createStore()
		type Events = {
			SET_SPEED: number
			DOUBLE: void
		}
		const o = coreMachine<Events, number>(0, (e, state) => {
			if (e.type === 'SET_SPEED') return e.payload
			if (e.type === 'DOUBLE') return state * 2
		})

		expect(store.get(o)).toBe(0)

		// 1. Test next helper with payload
		expect(store.get(o.next({ type: 'SET_SPEED', payload: 10 }))).toBe(10)
		expect(store.get(o.next({ type: 'SET_SPEED', payload: -5 }))).toBe(-5)
		// next helper should not mutate the active machine state
		expect(store.get(o)).toBe(0)

		// 2. Test disabled helper with payload
		// SET_SPEED 10 transition returns 10, which is different from current state (0)
		// so disabled() should evaluate to true (meaning it changes the state / is not a no-op).
		expect(store.get(o.disabled({ type: 'SET_SPEED', payload: 10 }))).toBe(true)
		// SET_SPEED 0 transition returns 0, which equals current state (0)
		// so disabled() should evaluate to false.
		expect(store.get(o.disabled({ type: 'SET_SPEED', payload: 0 }))).toBe(false)

		// 3. Test machine transitions with payload
		store.set(o, { type: 'SET_SPEED', payload: 10 })
		expect(store.get(o)).toBe(10)

		// After updating to 10, setting speed to 10 again results in same state, so disabled() should now return false
		expect(store.get(o.disabled({ type: 'SET_SPEED', payload: 10 }))).toBe(
			false,
		)

		store.set(o, { type: 'SET_SPEED', payload: 25 })
		expect(store.get(o)).toBe(25)
	})

	test('supports custom result mapping function', () => {
		const store = createStore()
		type Events = {
			INCREMENT: void
			RESET: void
		}
		// A machine where state is a number, but we map it to a string representation via result fn
		const o = coreMachine<Events, number, string>(
			0,
			(e, state) => {
				if (e.type === 'INCREMENT') return state + 1
				if (e.type === 'RESET') return 0
			},
			(state) => `Count: ${state}`,
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
})
