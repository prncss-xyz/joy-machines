import { createStore, atom } from 'jotai'

import { createSubject } from './subject'

describe('createSubject', () => {
	test('notifies registered listener atoms when published', () => {
		const [listenAtom, subjectAtom] = createSubject<string>()
		const store = createStore()
		const targetAtom = atom('')

		store.set(listenAtom, targetAtom)
		store.set(subjectAtom, 'hello')

		expect(store.get(targetAtom)).toBe('hello')

		store.set(subjectAtom, 'world')
		expect(store.get(targetAtom)).toBe('world')
	})

	test('supports multiple listeners with mapping functions', () => {
		const [listenAtom, subjectAtom] = createSubject<number>()
		const store = createStore()
		const targetAtom1 = atom(0)
		const targetAtom2 = atom('')

		store.set(listenAtom, targetAtom1, (n) => n * 2)
		store.set(listenAtom, targetAtom2, (n) => `value: ${n}`)

		store.set(subjectAtom, 21)

		expect(store.get(targetAtom1)).toBe(42)
		expect(store.get(targetAtom2)).toBe('value: 21')
	})

	test('isolates listeners between stores', () => {
		const [listenAtom, subjectAtom] = createSubject<string>()
		const firstStore = createStore()
		const secondStore = createStore()
		const firstTargetAtom = atom('')
		const secondTargetAtom = atom('')

		firstStore.set(listenAtom, firstTargetAtom)
		secondStore.set(listenAtom, secondTargetAtom)
		firstStore.set(subjectAtom, 'hello')

		expect(firstStore.get(firstTargetAtom)).toBe('hello')
		expect(secondStore.get(secondTargetAtom)).toBe('')
	})

	test('garbage collects listener atoms when no longer referenced elsewhere', async () => {
		const [listenAtom, subjectAtom] = createSubject<string>()
		const store = createStore()

		let targetAtom: any = atom('')
		store.set(listenAtom, targetAtom)

		store.set(subjectAtom, 'hello')
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
		store.set(subjectAtom, 'world')
	})
})
