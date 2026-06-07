import { createStore } from 'jotai/vanilla'
import { describe, expect, test } from 'vite-plus/test'

import { modalMachineAtom } from './modalMachineAtom.ts'
import { tag } from './utils/tags.ts'

describe('directMachineAtom type inference', () => {
	test('infers types correctly with explicit generics', () => {
		const store = createStore()
		const machineAtom = modalMachineAtom<
			{ start: number; stop: number },
			{ running: number; stopped: number }
		>(tag('stopped', 0), {
			running: {
				stop: (e) => tag('stopped', e),
			},
			stopped: {
				start: (e) => tag('running', e),
			},
		})

		// Minimal runtime check to ensure it functions
		expect(store.get(machineAtom)).toEqual({ payload: 0, type: 'stopped' })
		store.set(machineAtom, { payload: 5, type: 'start' })
		expect(store.get(machineAtom)).toEqual({ payload: 5, type: 'running' })
	})
})
