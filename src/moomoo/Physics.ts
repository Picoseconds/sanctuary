import Vec2 from "vec2";
import Player from "./Player";
import GameObject from '../gameobjects/GameObject';
import { getWeaponAttackDetails, hasCollision, getGameObjDamage } from "../items/items";
import GameState from "./GameState";
import { ItemType } from "../items/UpgradeItems";
import { getHat } from "./Hats";
import { PacketType } from "../packets/PacketType";
import { Packet } from "../packets/Packet";
import { PacketFactory } from "../packets/PacketFactory";

function collideCircles(pos1: Vec2, r1: number, pos2: Vec2, r2: number) {
  return pos1.distance(pos2) <= r1 + r2;
}

function collideRectangles(x1: number, y1: number, w1: number, x2: number, y2: number, w2: number, h2: number) {
  return x1 + w1 >= x2 && x1 <= x2 + w2 && y1 + w1 >= y2 && y1 <= y2 + h2;
}

function moveTowards(player: Player, angle: number, speed: number, deltaTime: number, state: GameState) {
  tryMovePlayer(player,
    deltaTime / 170,
    Math.cos(angle) * speed * 60, Math.sin(angle) * speed * 60,
    state
  );
}

/**
 * Utility function to collide a player and a GameObject with collideCircles()
 * @param player the player to test collision for
 * @param gameObj the GameObject to test collision for
 */
function collidePlayerGameObject(player: Player, gameObj: GameObject) {
  return collideCircles(player.location, 35, gameObj.location, gameObj.data === ItemType.PitTrap ? 0.3 * gameObj.realScale : gameObj.realScale);
}

function tryMovePlayer(player: Player, delta: number, xVel: number, yVel: number, state: GameState) {
  let inTrap = false;
  let packetFactory = PacketFactory.getInstance();

  let newLocation = new Vec2(
    player.location.x,
    player.location.y
  );

  for (let gameObj of player.getNearbyGameObjects(state, true)) {
    if (collidePlayerGameObject(player, gameObj)) {
      if (gameObj.isPlayerGameObject()) {
        if (!player.client?.seenGameObjects.includes(gameObj.id)) {
          player.client?.socket.send(
            packetFactory.serializePacket(
              new Packet(PacketType.LOAD_GAME_OBJ, [gameObj.getData()])
            )
          );

          player.client?.seenGameObjects.push(gameObj.id);
        }

        if (
          gameObj.data === ItemType.PitTrap &&
          gameObj.isEnemy(player, state.tribes)
        ) {
          inTrap = true;
        }

        if (!hasCollision(gameObj.data)) continue;
      }

      let dmg = gameObj.dmg;

      if (dmg && !(gameObj.isPlayerGameObject() && !gameObj.isEnemy(player, state.tribes))) {
        let hat = getHat(player.hatID);

        if (hat) {
          dmg *= hat.dmgMult || 1;
        }

        let angle = Math.atan2(player.location.y - gameObj.location.y, player.location.x - gameObj.location.x);
        player.velocity.add(Math.cos(angle), Math.sin(angle));
        player.health -= dmg;

        state.players.find(player => player.id == gameObj.ownerSID)?.client?.socket.send(
          packetFactory.serializePacket(
            new Packet(
              PacketType.HEALTH_CHANGE,
              [gameObj.location.x + Math.cos(angle) * (gameObj.realScale + 35), gameObj.location.y + Math.sin(angle) * (gameObj.realScale + 35), dmg, 1]
            )
          )
        )
      }

      xVel *= .83;
      yVel *= .83;

      let angle = Math.atan2(newLocation.y - gameObj.location.y, newLocation.x - gameObj.location.x);

      newLocation = new Vec2(
        gameObj.location.x + Math.cos(angle) * (gameObj.realScale + 35),
        gameObj.location.y + Math.sin(angle) * (gameObj.realScale + 35)
      );
    }
  }

  player.inTrap = inTrap;
  if (inTrap) return;

  newLocation.clamp(new Vec2(0 + 35, 0 + 35), new Vec2(14400 - 35, 14400 - 35));
  player.location = newLocation.add(delta * xVel, delta * yVel);
}

function movePlayer(player: Player, delta: number, state: GameState) {
  tryMovePlayer(player, delta, player.velocity.x, player.velocity.y, state);

  if (player.velocity.x || player.velocity.y) {
    player.velocity = player.velocity.multiply(0.993 ** delta, 0.993 ** delta);
  }
  for (let p of player.getNearbyPlayers(state)) {
    if (collideCircles(p.location, 30, player.location, 30)) {
      let dis = player.location.distance(p.location);
      let angle = Math.atan2(p.location.y - player.location.y, p.location.x - player.location.x);
      let distanceToMove = (30 + 30) - dis;
      p.location.add(Math.cos(angle) * distanceToMove, Math.sin(angle) * distanceToMove);
      player.location.add(-Math.cos(angle) * distanceToMove, -Math.sin(angle) * distanceToMove);
      tryMovePlayer(p, delta, p.velocity.x, p.velocity.y, state);
      tryMovePlayer(player, delta, player.velocity.x, player.velocity.y, state);
    }
  }
}

function pointCircle(point: Vec2, circlePos: Vec2, r: number) {
  if (point.distance(circlePos) <= r) {
    return true;
  }

  return false;
}

function getAttackLocation(player: Player) {
  let range = getWeaponAttackDetails(player.selectedWeapon).attackRange;
  return new Vec2(Math.cos(player.angle) * range, Math.sin(player.angle) * range).add(player.location);
}

function checkAttack(player: Player, players: Player[]) {
  let hitPlayers: Player[] = [];

  for (let hitPlayer of players) {
    if (pointCircle(getAttackLocation(player), hitPlayer.location, 35 * 2))
      hitPlayers.push(hitPlayer);
  }

  return hitPlayers;
}

function collideGameObjects(gameObject1: GameObject, gameObject2: GameObject) {
  return collideCircles(gameObject1.location, gameObject1.realScale * 0.9, gameObject2.location, gameObject1.realScale);
}

function checkAttackGameObj(player: Player, gameObjects: GameObject[]) {
  const GATHER_RANGE = Math.PI / 2.6;
  let hitGameObjects: GameObject[] = [];
  let range = getWeaponAttackDetails(player.selectedWeapon).attackRange;

  for (let gameObject of gameObjects) {
    if (range + gameObject.scale < gameObject.location.distance(player.location)) continue;

    let angle = Math.atan2(gameObject.location.y - player.location.y, gameObject.location.x - player.location.x);
    let angleDist = Math.abs(player.angle - angle) % (2 * Math.PI);

    if (angleDist > Math.PI) angleDist = 2 * Math.PI - angleDist;
    if (angleDist <= GATHER_RANGE) hitGameObjects.push(gameObject);
  }

  return hitGameObjects;
}

export { collideCircles, collideRectangles, moveTowards, checkAttack, collideGameObjects, checkAttackGameObj, movePlayer, getAttackLocation };
