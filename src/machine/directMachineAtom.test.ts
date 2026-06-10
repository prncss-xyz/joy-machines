import { atom, createStore } from 'jotai/vanilla'
import { describe, expect, test } from 'vite-plus/test'

import { directMachineAtom } from './directMachineAtom'

describe('directMachineAtom type inference', () => {
	test('infers types correctly with explicit generics', () => {
		const store = createStore()

		const machineAtom = directMachineAtom(
			{ count: 0, status: 'idle' },
			{
				inc: (p: number, state) => ({ count: state.count + p }),
			},
		)

		// Minimal runtime check to ensure it functions
		expect(store.get(machineAtom)).toEqual({ count: 0, status: 'idle' })
		store.set(machineAtom, { payload: 5, type: 'inc' })
		expect(store.get(machineAtom)).toEqual({ count: 5, status: 'idle' })
	})

	test('supports custom result and factory via opts', () => {
		const store = createStore()
		const customAtom = <T>(val: T) => atom(val)

		const machineAtom = directMachineAtom(
			{ count: 0 },
			{
				inc: (p: number, state) => ({ count: state.count + p }),
			},
			{
				factory: customAtom,
				result: (state) => `Count: ${state.count}`,
			},
		)

		expect(store.get(machineAtom)).toBe('Count: 0')
		store.set(machineAtom, { payload: 5, type: 'inc' })
		expect(store.get(machineAtom)).toBe('Count: 5')
	})
})
