export function merge<P extends object>(p: P, q: Partial<P>): P {
	let res: P | undefined = undefined
	for (const k in q) {
		if (res) (res as any)[k] = q[k]
		else if (p[k] !== q[k]) res = { ...p, [k]: q[k] }
	}
	return res ?? p
}
