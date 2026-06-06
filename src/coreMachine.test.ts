import { atom, createStore } from 'jotai/vanilla'
import { describe, test, expect } from 'vite-plus/test'
import { choreMachine } from './coreMachine.ts'

describe('core machine', () => {
	test('initial state', () => {
		const store = createStore()
		const o = choreMachine('idle', () => {})
		expect(store.get(o.machine)).toBe('idle')
	})

	test('transitions to new state when return value is defined and not undefined', () => {
		const store = createStore()
		type Events = {
			START: void
			STOP: void
		}
		const o = choreMachine<'idle' | 'running', Events>('idle', (e, state) => {
			if (e.type === 'START' && state === 'idle') return 'running'
			if (e.type === 'STOP' && state === 'running') return 'idle'
		})

		expect(store.get(o.machine)).toBe('idle')

		// Dispatch START
		store.set(o.machine, 'START')
		expect(store.get(o.machine)).toBe('running')

		// Dispatch STOP
		store.set(o.machine, 'STOP')
		expect(store.get(o.machine)).toBe('idle')
	})

	test('does not transition when return value is undefined', () => {
		const store = createStore()
		type Events = { NOOP: void }
		const o = choreMachine<'idle', Events>('idle', (e) => {
			if (e.type === 'NOOP') return undefined
		})

		expect(store.get(o.machine)).toBe('idle')
		store.set(o.machine, 'NOOP')
		expect(store.get(o.machine)).toBe('idle')
	})

	test('does not transition when return value is null (due to loose equality check in implementation)', () => {
		const store = createStore()
		type Events = { TO_NULL: void }
		const o = choreMachine<'idle' | null, Events>('idle', (e) => {
			if (e.type === 'TO_NULL') return null
		})

		expect(store.get(o.machine)).toBe('idle')
		store.set(o.machine, 'TO_NULL')
		// Loose equality check (next != undefined) means null is treated like undefined
		expect(store.get(o.machine)).toBe('idle')
	})

	test('supports side effects in transition using send (set)', () => {
		const store = createStore()
		const sideEffectAtom = atom('initial')
		type Events = { SIDE_EFFECT: void }
		const o = choreMachine<'idle' | 'done', Events>(
			'idle',
			(e, _state, send) => {
				if (e.type === 'SIDE_EFFECT') {
					send(sideEffectAtom, 'triggered')
					return 'done'
				}
			},
		)

		expect(store.get(o.machine)).toBe('idle')
		expect(store.get(sideEffectAtom)).toBe('initial')

		store.set(o.machine, 'SIDE_EFFECT')
		expect(store.get(o.machine)).toBe('done')
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
		const o = choreMachine<'idle' | 'running' | 'done' | null, Events>(
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
		expect(store.get(o.next('TO_NULL'))).toBeNull()
		expect(store.get(o.next('NOOP'))).toBeUndefined()
		expect(store.get(o.next('SIDE_EFFECT'))).toBe('done')
	})

	test('can helper evaluates event applicability based on return value, object equality, and side effects', () => {
		const store = createStore()
		const sideEffectAtom = atom('initial')
		type Events = {
			START: void
			NOOP: void
			SELF_LOOP: void
			TO_NULL: void
			SIDE_EFFECT: void
		}
		const o = choreMachine<'idle' | 'running' | null, Events>(
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
		// `can(e)` returns: next == undefined || Object.is(next, last) || dirty
		//
		// 1. START returns 'running', which is not undefined, not equal to 'idle', and did not call send.
		// Expected: false
		expect(store.get(o.can('START'))).toBe(false)

		// 2. SELF_LOOP returns 'idle', which equals 'idle' (Object.is(next, last) is true).
		// Expected: true
		expect(store.get(o.can('SELF_LOOP'))).toBe(true)

		// 3. TO_NULL returns null. Since null == undefined in JavaScript, it matches the first condition.
		// Expected: true
		expect(store.get(o.can('TO_NULL'))).toBe(true)

		// 4. NOOP returns undefined. Matches next == undefined.
		// Expected: true
		expect(store.get(o.can('NOOP'))).toBe(true)

		// 5. SIDE_EFFECT returns undefined (next == undefined) and triggers send (dirty = true).
		// Expected: true
		expect(store.get(o.can('SIDE_EFFECT'))).toBe(true)
	})

	test('fromSendable works with string event names (shortcut keys)', () => {
		const store = createStore()
		// Test shortcut string events (Sendable allows just the key if it resolves to void/no payload)
		type Events = {
			START: void
			STOP: void
		}
		const o = choreMachine<string, Events>('idle', (e, state) => {
			if (e.type === 'START' && state === 'idle') return 'running'
			if (e.type === 'STOP' && state === 'running') return 'idle'
		})

		expect(store.get(o.machine)).toBe('idle')

		// Dispatch START using just a string key
		store.set(o.machine, 'START')
		expect(store.get(o.machine)).toBe('running')

		// Dispatch STOP using just a string key
		store.set(o.machine, 'STOP')
		expect(store.get(o.machine)).toBe('idle')
	})

	test('handles events with payload (machine, can, next)', () => {
		const store = createStore()
		type Events = {
			SET_SPEED: number
			DOUBLE: void
		}
		const o = choreMachine<number, Events>(0, (e, state) => {
			if (e.type === 'SET_SPEED') return e.payload
			if (e.type === 'DOUBLE') return state * 2
		})

		expect(store.get(o.machine)).toBe(0)

		// 1. Test next helper with payload
		expect(store.get(o.next({ type: 'SET_SPEED', payload: 10 }))).toBe(10)
		expect(store.get(o.next({ type: 'SET_SPEED', payload: -5 }))).toBe(-5)
		// next helper should not mutate the active machine state
		expect(store.get(o.machine)).toBe(0)

		// 2. Test can helper with payload
		// SET_SPEED 10 transition returns 10, which is different from current state (0)
		// so can() should evaluate to false (meaning it changes the state / is not a no-op).
		expect(store.get(o.can({ type: 'SET_SPEED', payload: 10 }))).toBe(false)
		// SET_SPEED 0 transition returns 0, which equals current state (0)
		// so can() should evaluate to true.
		expect(store.get(o.can({ type: 'SET_SPEED', payload: 0 }))).toBe(true)

		// 3. Test machine transitions with payload
		store.set(o.machine, { type: 'SET_SPEED', payload: 10 })
		expect(store.get(o.machine)).toBe(10)

		// After updating to 10, setting speed to 10 again results in same state, so can() should now return true
		expect(store.get(o.can({ type: 'SET_SPEED', payload: 10 }))).toBe(true)

		store.set(o.machine, { type: 'SET_SPEED', payload: 25 })
		expect(store.get(o.machine)).toBe(25)
	})
})
