import Vec2 from "vec2";
import Player from "./Player";
import { eucDistance } from "./util";
import GameObject from '../gameobjects/GameObject';
import { gameObjectSizes } from "../gameobjects/gameobjects";
import { getWeaponAttackDetails, Weapons } from "../items/items";

function collideCircles(pos1: Vec2, r1: number, pos2: Vec2, r2: number) {
    return pos1.distance(pos2) <= r1 + r2;
}

function collideRectangles(x1: number, y1: number, w1: number, h1: number, x2: number, y2: number, w2: number, h2: number) {
    return x1 + w1 >= x2 && x1 <= x2 + w2 && y1 + w1 >= y2 && y1 <= y2 + h2;
}

function moveTowards(player: Player, angle: number, speed: number, deltaTime: number) {
  tryMovePlayer(player, deltaTime / 170, Math.cos(angle) * speed * 60, Math.sin(angle) * speed * 60);
}

function tryMovePlayer(player: Player, delta: number, xVel: number, yVel: number) {
  // TODO: GameObject collision
  player.location = new Vec2(
    player.location.x + delta * xVel,
    player.location.y + delta * yVel
  );
}

function movePlayer(player: Player, delta: number) {
  if (player.velocity.x || player.velocity.y) {
    let angle = Math.atan2(player.velocity.y, player.velocity.x);
    tryMovePlayer(player, delta, player.velocity.x, player.velocity.y);
    player.velocity = player.velocity.multiply(.85, .85);
  }
}

function pointCircle(point: Vec2, circlePos: Vec2, r: number) {
  if (point.distance(circlePos) <= r) {
    return true;
  }

  return false;
}

function getAttackLocation(player: Player) {
  let range = getWeaponAttackDetails(player.weapon).attackRange;
  return new Vec2(Math.cos(player.angle) * range, Math.sin(player.angle) * range).add(player.location);
}

function checkAttack(player: Player, angle: number, players: Player[]) {
  let weaponDetails = getWeaponAttackDetails(player.weapon);
  let hitPlayers: Player[] = [];

  for (let hitPlayer of players) {
    if (collideCircles(getAttackLocation(player), 10, hitPlayer.location, 35 * 2))
      hitPlayers.push(hitPlayer);
  }

  return hitPlayers;
}

function collideGameObjects(gameObject1: GameObject, gameObject2: GameObject) {
  return collideCircles(gameObject1.location, gameObjectSizes[gameObject1.type] || 0, gameObject2.location, gameObjectSizes[gameObject2.type] || 0);
}

function checkAttackGameObj(player: Player, angle: number, gameObjects: GameObject[]) {
  let weaponDetails = getWeaponAttackDetails(player.weapon);
  let hitGameObjects: GameObject[] = [];

  for (let gameObject of gameObjects) {
    if (collideCircles(getAttackLocation(player), 10, gameObject.location, gameObjectSizes[gameObject.type] || 0))
      hitGameObjects.push(gameObject);
  }

  return hitGameObjects;
}

export { collideCircles, collideRectangles, moveTowards, checkAttack, collideGameObjects, checkAttackGameObj, movePlayer, getAttackLocation };