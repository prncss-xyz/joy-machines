import { describe, expect, it } from 'vite-plus/test'

import { createScope } from './createScope'

describe('createScope', () => {
	it('should create a scope and retrieve items', () => {
		const scope = createScope<string>()
		const getScopeItem = scope((key) => ({ key, onMount() {} }))
		const item1 = getScopeItem('a')
		const item2 = getScopeItem('a')
		expect(item1).toBe(item2)
	})
})
