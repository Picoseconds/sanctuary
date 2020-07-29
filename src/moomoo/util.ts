import Vec2 from "vec2";

enum SkinColor {
  Light1 = 2,
  Light2 = 0,
  Light3 = 1,
  Pink = 3,
  White,
  Red,
  Black,
  Purple,
  Blue,
  Green
}

function eucDistance(a: number[], b: number[]) {
  return Math.hypot(...a.map((val, i) => val - b[i]));
}

function randomPos(width: number, height: number) {
  return new Vec2(Math.random() * (width + 1), Math.random() * (height + 1))
}

function chunk<T>(arr: T[], len: number) {
  var chunks = [],
    i = 0,
    n = arr.length;

  while (i < n) {
    chunks.push(arr.slice(i, i += len));
  }

  return chunks;
}

interface Comparator<T> {
  (a: T, b: T): number
}

interface Array<T> {
  stableSort(cmp?: Comparator<T>): Array<T>;
}

let defaultCmp: Comparator<any> = (a, b) => {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function stableSort<T>(array: T[], cmp: Comparator<T> = defaultCmp): T[] {
  let stabilized = array.map((el, index) => <[T, number]>[el, index]);
  let stableCmp: Comparator<[T, number]> = (a, b) => {
    let order = cmp(a[0], b[0]);
    if (order != 0) return order;
    return a[1] - b[1];
  }

  stabilized.sort(stableCmp);
  for (let i = 0; i < array.length; i++) {
    array[i] = stabilized[i][0];
  }

  return array;
}

export { SkinColor, eucDistance, randomPos, chunk, stableSort };