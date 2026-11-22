// A tiny seeded random number generator (mulberry32), so a screenshot seed
// always replays the same patrol jitter and the same world.
export function makeRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one of `items` with the seeded generator. */
export function pick(random, items) {
  return items[Math.floor(random() * items.length)];
}
