import { describe, test, expect } from 'vite-plus/test'
import { createStore } from 'jotai/vanilla'
import { directMachineAtom } from './directMachineAtom.ts'

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
		store.set(machineAtom, { type: 'inc', payload: 5 })
		expect(store.get(machineAtom)).toEqual({ count: 5, status: 'idle' })
	})
})
