import { createStore, atom, type Atom, type WritableAtom } from 'jotai'

import { dependencies } from './dependencies'

describe('dependencies', () => {
	it('should bind and retrieve dependencies using getDep and dep proxy', () => {
		const { bind, dep } = dependencies<{
			foo: Atom<string>
			bar: Atom<number>
		}>()

		const store = createStore()

		const fooAtom = atom('hello')
		const barAtom = atom(42)

		const [bindingAtom, t] = bind({ bar: barAtom, foo: fooAtom })
		store.set(bindingAtom, t)

		// Test dep proxy
		expect(store.get(dep.foo)).toBe('hello')
		expect(store.get(dep.bar)).toBe(42)
	})

	it('should support WritableAtom dependencies', () => {
		const { bind, dep } = dependencies<{
			foo: WritableAtom<string, [string], void>
		}>()

		const store = createStore()
		const fooAtom = atom('hello')

		const [bindingAtom, t] = bind({ foo: fooAtom })
		store.set(bindingAtom, t)

		expect(store.get(dep.foo)).toBe('hello')

		store.set(dep.foo, 'world')
		expect(store.get(dep.foo)).toBe('world')
		expect(store.get(fooAtom)).toBe('world')
	})

	it('should throw error if dependencies are not bound', () => {
		const { dep } = dependencies<{ foo: Atom<string> }>()
		const store = createStore()

		expect(() => store.get(dep.foo)).toThrow('dependencies not bound')
	})
})
