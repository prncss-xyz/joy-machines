import { clearCollectionEntries, collection } from './collection'

describe('collection', () => {
	it('should create and retrieve items', () => {
		const factory = vi.fn((key: string) => ({ id: key, value: Math.random() }))
		const col = collection(factory)

		const item1 = col.get('a')
		expect(factory).toHaveBeenCalledTimes(1)
		expect(item1.id).toBe('a')

		const item2 = col.get('a')
		expect(factory).toHaveBeenCalledTimes(1) // Should use cached
		expect(item2).toBe(item1)

		const item3 = col.get('b')
		expect(factory).toHaveBeenCalledTimes(2)
		expect(item3.id).toBe('b')
	})

	it('should iterate over items', () => {
		const col = collection((key: string) => ({ id: key }))
		col.get('a')
		col.get('b')
		col.get('c')

		const keys: string[] = []
		col.forEach((key, payload) => {
			keys.push(key)
			expect(payload.id).toBe(key)
		})

		expect(keys).toEqual(['a', 'b', 'c'])
	})

	it('should clear entries based on filter', () => {
		const factory = vi.fn((key: string) => ({ id: key }))
		const col = collection(factory)

		col.get('a')
		col.get('b')
		col.get('c')
		expect(factory).toHaveBeenCalledTimes(3)

		// Clear only 'a' and 'c'
		clearCollectionEntries((key) => key === 'a' || key === 'c')

		// 'b' should remain cached
		col.get('b')
		expect(factory).toHaveBeenCalledTimes(3)

		// 'a' should be re-created
		col.get('a')
		expect(factory).toHaveBeenCalledTimes(4)

		// 'c' should be re-created
		col.get('c')
		expect(factory).toHaveBeenCalledTimes(5)
	})

	it('should hydrate', () => {
		const values = new Map<string, string>()
		// Use raw key because collection iterates values and calls getHash(key)
		values.set('a', JSON.stringify({ hydrated: true, id: 'a' }))

		const factory = vi.fn()
		const col = collection(factory, {
			hydrate: {
				decode: (val, _key) => JSON.parse(val),
				values: values.entries(),
			},
		})

		const item = col.get('a')
		expect(item).toEqual({ hydrated: true, id: 'a' })
		expect(factory).not.toHaveBeenCalled()
	})

	it('should clear mounted entries on unmount when ttl is 0', async () => {
		const factoryWithMount = vi.fn((_key: string, mount: any) => {
			const release = mount!()
			return { release }
		})
		const col = collection(factoryWithMount)

		const item = col.get('a')
		item.release()
		await Promise.resolve()

		col.get('a')
		expect(factoryWithMount).toHaveBeenCalledTimes(2)
	})

	it('should handle TTL', async () => {
		vi.useFakeTimers()
		const factoryWithMount = vi.fn((_key: string, mount: any) => {
			const release = mount!()
			return { release }
		})
		const col2 = collection(factoryWithMount, { ttl: 100 })

		const item2 = col2.get('a')
		item2.release()

		// Advance time slightly to let microtasks/promises run, but less than TTL
		await vi.advanceTimersByTimeAsync(1)

		// Now timer should be set.
		// If we get it again before timer fires, it should clear timer.
		vi.advanceTimersByTime(50)
		col2.get('a')
		// Should still be cached (factory not called again)
		expect(factoryWithMount).toHaveBeenCalledTimes(1)

		// Now we release again to restart TTL
		item2.release()

		// Advance past TTL
		await vi.advanceTimersByTimeAsync(101)

		// Should be gone
		col2.get('a')
		expect(factoryWithMount).toHaveBeenCalledTimes(2)

		vi.useRealTimers()
	})
})
