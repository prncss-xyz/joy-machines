import { useAtomValue, useSetAtom } from 'jotai'
import type { WritableAtom } from 'jotai/vanilla'
import type { Atom } from 'jotai/vanilla'

import type { Sendable } from './utils/sendable.ts'

export function useRegisterButton<E>(
	machineAtom: WritableAtom<any, [e: Sendable<E>], void> & {
		can: (e: Sendable<E>) => Atom<boolean>
	},
	event: Sendable<E>,
) {
	const disabled = !useAtomValue(machineAtom.can(event))
	const send = useSetAtom(machineAtom)

	return {
		disabled,
		onClick: () => send(event),
	}
}
