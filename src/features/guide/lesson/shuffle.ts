// A stable shuffle: the same seed always gives the same order. A check's options keep the order of
// their source, so each member sees them in an order of their own instead (`Check.tsx`).
export function shuffled<T>(items: readonly T[], seed: string): T[] {
  // FNV-1a turns the seed into 32 bits; mulberry32 draws from them.
  let state = 0x811c9dc5;
  for (let index = 0; index < seed.length; index++) state = Math.imul(state ^ seed.charCodeAt(index), 0x01000193);
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const order = [...items];
  for (let index = order.length - 1; index > 0; index--) {
    const other = Math.floor(next() * (index + 1));
    [order[index], order[other]] = [order[other], order[index]];
  }
  return order;
}
