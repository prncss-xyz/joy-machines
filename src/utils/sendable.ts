import { PAYLOAD, TYPE, type Tags } from './tags.ts'
import type { Prettify } from './types.ts'

export type KeysOfVoid<T> = {
	[K in keyof T]: T[K] extends void ? K : never
}[keyof T]

export type Sendable<T> = Prettify<Tags<T> | KeysOfVoid<T>>

export function fromSendable<T>(event: Sendable<T>): Tags<T> {
	return typeof event === 'string'
		? ({ [PAYLOAD]: undefined, [TYPE]: event } as unknown as Tags<T>)
		: (event as any)
}
