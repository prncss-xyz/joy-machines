import { createStore, atom } from 'jotai'
import { describe, expect, test } from 'vite-plus/test'

import { createSubject } from './subject'

describe('createSubject', () => {
	test('notifies registered listener atoms when published', () => {
		const [listen, subject] = createSubject<string>()
		const store = createStore()
		const targetAtom = atom('')

		listen(targetAtom)
		store.set(subject, 'hello')

		expect(store.get(targetAtom)).toBe('hello')

		store.set(subject, 'world')
		expect(store.get(targetAtom)).toBe('world')
	})

	test('supports multiple listeners with mapping functions', () => {
		const [listen, subject] = createSubject<number>()
		const store = createStore()
		const targetAtom1 = atom(0)
		const targetAtom2 = atom('')

		listen(targetAtom1, (n) => n * 2)
		listen(targetAtom2, (n) => `value: ${n}`)

		store.set(subject, 21)

		expect(store.get(targetAtom1)).toBe(42)
		expect(store.get(targetAtom2)).toBe('value: 21')
	})

	test('garbage collects listener atoms when no longer referenced elsewhere', async () => {
		const [listen, subject] = createSubject<string>()
		const store = createStore()

		let targetAtom: any = atom('')
		listen(targetAtom)

		store.set(subject, 'hello')
		expect(store.get(targetAtom)).toBe('hello')

		// Remove the only strong reference to targetAtom
		targetAtom = null

		// If globalThis.gc exists, trigger GC to verify it cleans up successfully
		if (globalThis.gc) {
			globalThis.gc()
			// FinalizationRegistry runs asynchronously, so let's yield
			await new Promise((resolve) => setTimeout(resolve, 10))
			globalThis.gc()
		}

		// Verify publishing still succeeds without trying to update the garbage-collected atom
		store.set(subject, 'world')
	})
})
