import { atom, useAtomValue, type Atom } from 'jotai'
import { useState } from 'react'

function createDummyAtom() {
	return atom(undefined)
}

export function useAnchorScope<K>(
	scope: <A extends Atom<any>>(fn: (k: K) => A) => (k: K) => A,
	key: K,
) {
	const [dummyAtom] = useState(() => scope(createDummyAtom))
	useAtomValue(dummyAtom(key))
}
