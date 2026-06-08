import { atom, type Atom, type WritableAtom } from 'jotai'
import { useHydrateAtoms } from 'jotai/utils'
import type { ReactNode } from 'react'

import { cached } from './utils/cached.ts'
import type { Prettify } from './utils/types.ts'

export function dependencies<O>() {
	type T = Prettify<{
		[K in keyof O as O[K] extends Atom<any> | WritableAtom<any, any, any>
			? K
			: never]: O[K]
	}>
	type K = keyof T
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

	const getDep = cached((k: K) => {
		return atom(
			(get) => {
				const b = get(bindingAtom)
				if (b == undefined) throw new Error('dependencies not bound')
				// this will only happen in TestContainer
				const r = b[k]
				if (r == undefined) throw new Error('dependency not bound')
				return get(r as any)
			},
			(get, set, ...args: any[]) => {
				const b = get(bindingAtom)
				if (b == undefined) throw new Error('dependencies not bound')
				const r = b[k]
				if (r == undefined) throw new Error('dependency not bound')
				return set(r as any, ...args)
			},
		)
	})

	const dep = new Proxy({} as T, {
		get(_, prop) {
			return getDep(prop as K)
		},
	})

	return {
		TestContainer,
		bind,
		dep,
	}
}
