import { createStore, atom } from 'jotai'
import { describe, expect, it } from 'vite-plus/test'

import { dependencies } from './dependencies.ts'

describe('dependencies', () => {
	it('should bind and retrieve dependencies using getDep and dep proxy', () => {
		const { bind, dep } = dependencies<{ foo: string; bar: number }>()

		const store = createStore()

		const fooAtom = atom('hello')
		const barAtom = atom(42)

		const [bindingAtom, t] = bind({ bar: barAtom, foo: fooAtom })
		store.set(bindingAtom, t)

		// Test dep proxy
		expect(store.get(dep.foo)).toBe('hello')
		expect(store.get(dep.bar)).toBe(42)
	})

	it('should throw error if dependencies are not bound', () => {
		const { dep } = dependencies<{ foo: string }>()
		const store = createStore()

		expect(() => store.get(dep.foo)).toThrow('dependencies not bound')
	})
})
