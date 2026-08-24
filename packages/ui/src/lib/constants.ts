/**
 * One shared empty array for omitted list props.
 *
 * `items = []` in a parameter list allocates a fresh array on every render, so
 * any memo or effect downstream that depends on the prop re-runs even when
 * nothing changed. Typed `never[]` so it is assignable to any element type.
 * Nothing mutates props, so sharing one instance is safe.
 */
export const EMPTY: never[] = []
