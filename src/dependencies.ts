import { atom, type Atom } from 'jotai'
import { useHydrateAtoms } from 'jotai/utils'
import type { ReactNode } from 'react'

import { cached } from './utils/cached.ts'

export function dependencies<O>() {
	type T = { [K in keyof O]: Atom<O[K]> }
	const bindingAtom = atom<T | undefined>(undefined)

	function bind(t: T) {
		return [bindingAtom, t] as const
	}

	function TestContainer({
		children,
		...props
	}: {
		children: ReactNode
	} & Partial<T>) {
		useHydrateAtoms([bind(props as any)])
		return children
	}

	const getDep = cached((k: keyof O) => {
		return atom((get) => {
			const b = get(bindingAtom)
			if (b == undefined) throw new Error('dependencies not bound')
			// this will only happen in TestContainer
			const r = b[k]
			if (r == undefined) throw new Error('dependency not bound')
			return get(r)
		})
	})

	const dep = new Proxy({} as { [K in keyof O]: Atom<O[K]> }, {
		get(_, prop) {
			return getDep(prop as keyof O)
		},
	})

	return {
		TestContainer,
		bind,
		dep,
	}
}
