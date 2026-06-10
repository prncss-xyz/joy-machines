import * as jotai from 'jotai'
import { describe, expect, test, vi } from 'vite-plus/test'

import { coreMachineAtom } from './coreMachineAtom'
import { useRegisterButton } from './useRegisterButton'

// Mock jotai hooks since react is not installed in the workspace environment.
// This allows us to unit test the hook's logic directly.
vi.mock('jotai', async () => {
	const original = await vi.importActual<typeof import('jotai')>('jotai')
	return {
		...original,
		useAtomValue: vi.fn(),
		useSetAtom: vi.fn(),
	}
})

describe('useRegisterButton', () => {
	test('returns correct disabled and onClick handlers', () => {
		type E = { START: void }
		const machine = coreMachineAtom<E, 'idle' | 'running'>(
			'idle',
			(e, state) => {
				if (e.type === 'START' && state === 'idle') return 'running'
				return state
			},
		)

		const mockSend = vi.fn()
		vi.mocked(jotai.useSetAtom).mockReturnValue(mockSend)

		// Case 1: Transition is applicable (enabled = true -> disabled = false)
		vi.mocked(jotai.useAtomValue).mockReturnValue(true)

		const button1 = useRegisterButton(machine, 'START')
		expect(jotai.useAtomValue).toHaveBeenCalledWith(expect.any(Object))
		expect(jotai.useSetAtom).toHaveBeenCalledWith(machine)
		expect(button1.disabled).toBe(false)

		button1.onClick()
		expect(mockSend).toHaveBeenCalledWith('START')

		// Case 2: Transition is not applicable (enabled = false -> disabled = true)
		vi.mocked(jotai.useAtomValue).mockReturnValue(false)

		const button2 = useRegisterButton(machine, 'START')
		expect(button2.disabled).toBe(true)
	})
})
