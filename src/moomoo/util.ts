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

export { SkinColor, eucDistance, randomPos, chunk };