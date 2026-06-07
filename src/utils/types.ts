export type Prettify<T> = unknown & {
	[K in keyof T]: T[K]
}

export type ValueUnion<T> = Prettify<T[keyof T]>
