import { describe, test, expect } from 'vite-plus/test'
import { createStore } from 'jotai/vanilla'
import { modalMachineAtom } from './modalMachineAtom.ts'
import { tag } from './utils/tags.ts'

describe('directMachineAtom type inference', () => {
	test('infers types correctly with explicit generics', () => {
		const store = createStore()
		const machineAtom = modalMachineAtom<
			{ start: number; stop: number },
			{ running: number; stopped: number }
		>(tag('stopped', 0), {
			stopped: {
				start: (e) => tag('running', e),
			},
			running: {
				stop: (e) => tag('stopped', e),
			},
		})

		// Minimal runtime check to ensure it functions
		expect(store.get(machineAtom)).toEqual({ payload: 0, type: 'stopped' })
		store.set(machineAtom, { type: 'start', payload: 5 })
		expect(store.get(machineAtom)).toEqual({ payload: 5, type: 'running' })
	})
})
