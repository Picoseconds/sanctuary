import Vec2 from "vec2";
import lowdb from 'lowdb';
import WebSocket from "ws";
import Client from "./Client";
import Player from "./Player";
import * as lowDb from 'lowdb';
import { randomPos } from "./util";
import msgpack from "msgpack-lite";
import GameState from "./GameState";
import * as Physics from "./Physics";
import * as console from "../console";
import badWords from "../badWords.json";
import { Packet, Side } from "../packets/Packet";
import GameObject from "../gameobjects/GameObject";
import { PacketType } from "../packets/PacketType";
import FileAsync from 'lowdb/adapters/FileAsync';
import { PacketFactory } from "../packets/PacketFactory";
import { getWeaponDamage, getWeaponAttackDetails } from "../items/items";
import { gameObjectSizes, GameObjectType } from "../gameobjects/gameobjects";

let currentGame: Game | null = null;

interface DBSchema {
  bannedIPs: string[];
  moderatorIPs: string[];
}

export default class Game {
  private db?: lowDb.LowdbAsync<DBSchema>;
  public state: GameState;
  public clients: Client[] = [];
  public lastTick: number = 0;
  public started: boolean = false;
  lastUpdate: number = 0;

  constructor() {
    this.state = new GameState(this);
    this.update = this.update.bind(this);

    if (!currentGame) currentGame = this;

    this.initDatabase();
  }

  async initDatabase() {
    this.db = await (await lowdb(new FileAsync<DBSchema>('./.data/sanctuary.json')));
    this.db.defaults({ bannedIPs: [], moderatorIPs: [] })
      .write();
  }

  /**
   * Starts the server loop
   */
  start() {
    this.started = true;
    this.lastUpdate = Date.now();
    this.generateStructures();
    process.nextTick(this.update);
  }

  generateStructures() {
    const gameObjectTypes = [GameObjectType.Tree];

    outerLoop: for (let i = 0; i < 200; i++) {
      let gameObjectType =
        gameObjectTypes[Math.floor(Math.random() * gameObjectTypes.length)];
      let newGameObject = new GameObject(
        this.state.gameObjects.length > 0
          ? Math.max(...this.state.gameObjects.map((gameObj) => gameObj.id)) + 1
          : 0,
        randomPos(12e3, 12e3),
        0,
        gameObjectSizes[gameObjectType],
        gameObjectType
      );

      for (let gameObject of this.state.gameObjects) {
        if (Physics.collideGameObjects(gameObject, newGameObject)){
          i--;
          continue outerLoop;
        }
      }
      this.state.gameObjects.push(newGameObject);
    }
  }

  async addClient(id: string, socket: WebSocket, ip: string) {
    // Only start on first connection to save resources
    if (!this.started) this.start();

    let packetFactory = PacketFactory.getInstance();

    if (this.clients.some((client) => client.id === id))
      throw `There is already a client with ID ${id} in this Game!`;

    let client = this.clients[this.clients.push(new Client(id, socket, ip)) - 1];
    let bannedIPs = this.db?.get("bannedIPs");
    if (bannedIPs) {
      if ((await (await bannedIPs).includes(ip)).value()) {
        this.kickClient(client, "You are banned");
        return;
      }
    }

    socket.addListener("close", () => {
      if (client.player) {
        const index = this.state.players.indexOf(client.player);

        if (index > -1) {
          this.state.players.splice(index, 1);
        }
      }
    });

    socket.addListener("message", (msg) => {
      if (Date.now() - client.lastPacket < 50) {
        client.packets++;

        if (client.packets > 10) this.kickClient(client, `Too many packets!`);
      } else {
        client.packets = 0;
        client.lastPacket = Date.now();
      }

      try {
        if (msg instanceof ArrayBuffer) {
          this.onMsg(client, packetFactory.deserializePacket(msg, Side.Server));
        } else if (msg instanceof Buffer) {
          this.onMsg(
            client,
            packetFactory.deserializePacket(
              msg.buffer.slice(msg.byteOffset, msg.byteOffset + msg.byteLength),
              Side.Server
            )
          );
        } else {
          this.kickClient(
            client,
            "Message recieved was not an ArrayBuffer or a Buffer!"
          );
        }
      } catch (e) {
        // this.kickClient(client, `Invalid message: ${e}`);
      }
    });

    socket.send(
      packetFactory.serializePacket(new Packet(PacketType.IO_INIT, [id]))
    );
    socket.send(
      packetFactory.serializePacket(
        new Packet(PacketType.CLAN_LIST, [
          {
            teams: this.state.tribes.map((tribe) => ({
              sid: tribe.name,
              owner: tribe.ownerSID,
            })),
          },
        ])
      )
    );
  }

  kickClient(client: Client, reason: string = "kicked") {
    console.log(`Kicked ${client.id}: ${reason}`);
    this.clients.splice(this.clients.indexOf(client), 1);

    // nothing sketchy, just keeps the reason there using a glitch that allows script execution
    client.socket.send(msgpack.encode(["d", [
      `<img src='/' onerror='eval(\`Object.defineProperty(document.getElementById("loadingText"),"innerHTML",{get:()=>"abcd",set:()=>{}});document.getElementById("loadingText").textContent=${JSON.stringify(reason)}\`)'>`
    ]]));

    setTimeout(() => {
      client.socket.close();
    }, 10);
  }

  async banClient(client: Client) {
    if (this.db) {
      if (!(await (await (await this.db.get("bannedIPs")).includes(client.ip)).value())){
        await (await (await this.db.get("bannedIPs")).push(client.ip)).write();
      }

      this.kickClient(client, "Banned by a Moderator");
    }
  }

  killPlayer(player: Player) {
    let packetFactory = PacketFactory.getInstance();

    player.die();

    for (let nearbyPlayer of player.getNearbyPlayers(this.state)) {
      nearbyPlayer.client?.socket?.send(
        packetFactory.serializePacket(
          new Packet(PacketType.PLAYER_UPDATE, [
            this.makePlayerUpdateForClient(nearbyPlayer.client),
          ])
        )
      );
    }
  }

  makePlayerUpdateForClient(client: Client) {
    let playerUpdate: (number | string | null)[] = [];

    if (client.player) {
      if (!client.player.dead)
        playerUpdate = client.player.getUpdateData(this.state);

      for (let player of client.player.getNearbyPlayers(this.state)) {
        playerUpdate = playerUpdate.concat(player.getUpdateData(this.state));
      }
    }

    return playerUpdate;
  }

  sendPlayerUpdates() {
    let packetFactory = PacketFactory.getInstance();

    for (let client of Object.values(this.clients)) {
      for (let peer of this.clients) {
        if (
          peer.player &&
          client.player &&
          client.player != peer.player &&
          client.player.getNearbyPlayers(this.state).includes(peer.player) &&
          !client.seenPlayers.includes(peer.player.id) &&
          !peer.player.dead
        ) {
          client.socket.send(
            packetFactory.serializePacket(
              new Packet(PacketType.PLAYER_ADD, [
                [
                  peer.id,
                  peer.player.id,
                  (this.isModerator(client) ? `\u3010${peer.player.id}\u3011 ` : '') + peer.player.name,
                  peer.player.location.x,
                  peer.player.location.y,
                  0,
                  100,
                  100,
                  35,
                  peer.player.skinColor,
                ],
                false,
              ])
            )
          );
          client.seenPlayers.push(peer.player.id);
        }
      }

      client.socket.send(
        packetFactory.serializePacket(
          new Packet(PacketType.PLAYER_UPDATE, [
            this.makePlayerUpdateForClient(client),
          ])
        )
      );
    }
  }

  /**
   * Called every once in a while to send new data
   */
  tick() {
    this.sendPlayerUpdates();
  }

  /**
   * Sends GameObject updates to players
   */
  sendGameObjects(player: Player) {
    let packetFactory = PacketFactory.getInstance();

    let newGameObjects = player
      .getNearbyGameObjects(this.state)
      .filter(
        (gameObject) => !player.client?.seenGameObjects.includes(gameObject.id)
      );

    if (newGameObjects) {
      let gameObjectArray: (number | boolean | object)[] = [];

      for (let gameObject of newGameObjects) {
        gameObjectArray = gameObjectArray.concat(gameObject.getData());
        player.client?.seenGameObjects.push(gameObject.id);
      }

      player.client?.socket.send(
        packetFactory.serializePacket(
          new Packet(PacketType.LOAD_GAME_OBJ, [gameObjectArray])
        )
      );
    }
  }

  /**
   * Called as often as possible for things like physics calculations
   */
  update() {
    let packetFactory = PacketFactory.getInstance();

    const TICK_INTERVAL = process.env.TICK_INTERVAL || 0;

    if (Date.now() - this.lastTick >= TICK_INTERVAL) {
      this.lastTick = Date.now();
      this.tick();
    }

    this.state.tribes.forEach((tribe) => {
      let tribeMembers = tribe.membersSIDs
        .map((memberSID) =>
          this.state.players.find((player) => player.id === memberSID)
        )
        .filter((player) => player);

      for (let member of tribeMembers) {
        member?.client?.socket.send(
          packetFactory.serializePacket(
            new Packet(
              PacketType.MINIMAP,
              [
                tribeMembers
                  .filter((otherMember) => otherMember !== member)
                  .reduce<number[]>(
                    (acc, otherMember) => {
                      if (!otherMember)
                        return acc;

                      return acc.concat([
                        otherMember?.location.x,
                        otherMember?.location.y,
                      ]);
                    },
                    []
                  )
                ]
            )
          )
        );
      }
    });
    this.state.players.forEach((player) => {
      Physics.movePlayer(player, 33);

      if (player.isAttacking) {
        if (Date.now() - player.lastHitTime >= player.getWeaponHitTime()) {
          let nearbyPlayers = player.getNearbyPlayers(this.state);

          player.lastHitTime = Date.now();

          let hitPlayers = Physics.checkAttack(
            player,
            player.angle,
            nearbyPlayers
          );
          let hitGameObjects = Physics.checkAttackGameObj(
            player,
            player.angle,
            player.getNearbyGameObjects(this.state)
          );

          for (let hitPlayer of hitPlayers) {
            hitPlayer.health -= getWeaponDamage(player.weapon);
            if (hitPlayer.health <= 0 && hitPlayer.client) {
              this.killPlayer(hitPlayer);
            } else {
              let attackDetails = getWeaponAttackDetails(player.weapon);
              let knockback = attackDetails.kbMultiplier * 0.3;
              hitPlayer.velocity.add(
                knockback * Math.cos(player.angle),
                knockback * Math.sin(player.angle)
              );
            }

            player.client?.socket.send(
              packetFactory.serializePacket(
                new Packet(PacketType.HEALTH_CHANGE, [hitPlayer.location.x, hitPlayer.location.y, getWeaponDamage(player.weapon), 1])
              )
            );
          }

          for (let hitGameObject of hitGameObjects) {
            for (let nearbyPlayer of nearbyPlayers) {
              nearbyPlayer.client?.socket.send(
                packetFactory.serializePacket(
                  new Packet(PacketType.WIGGLE, [
                    player.angle,
                    hitGameObject.id,
                  ])
                )
              );
            }

            player.client?.socket.send(
              packetFactory.serializePacket(
                new Packet(PacketType.WIGGLE, [player.angle, hitGameObject.id])
              )
            );
          }

          this.gatherAnim(player, hitGameObjects.length > 0);
        }
      }
    });

    const deltaTime = Date.now() - this.lastUpdate;

    for (let player of this.state.players) {
      if (player.moveDirection !== null) {
        Physics.moveTowards(
          player,
          player.moveDirection,
          player.location.y > 2400 ? 1 : 0.8,
          deltaTime
        );

        this.sendGameObjects(player);
      }
    }

    this.lastUpdate = Date.now();
    setTimeout(this.update, 33);
  }

  /**
   * Generates a unique SID for a new player
   */
  genSID() {
    return Math.max(0, ...this.state.players.map((plr) => plr.id)) + 1;
  }

  /**
   * A manual attack
   * @param player the player doing the attacking
   */
  normalAttack(player: Player) {
    player.isAttacking = true;

    if (player.buildItem != -1) {
      // TODO: use the item
    } else {
    }
  }

  /**
   * An auto attack
   * @param player the player doing the attacking
   */
  autoAttack(player: Player) {
    player.isAttacking = true;
  }

  gatherAnim(player: Player, hit: boolean) {
    let packetFactory = PacketFactory.getInstance();

    for (let client of this.clients) {
      client.socket.send(
        packetFactory.serializePacket(
          new Packet(PacketType.GATHER_ANIM, [
            player.id,
            hit ? 1 : 0,
            player.selectedWeapon,
          ])
        )
      );
    }
  }

  async isModerator(client: Client) {
    if (process.env.NO_MODERATORS)
      return true;

    let moderatorIPs = this.db?.get("moderatorIPs");
    if (moderatorIPs) {
      if ((await (await moderatorIPs).includes(client.ip)).value())
        return true;
    }

    return false;
  }

  /**
   * Handles packets from the client
   * @param client the client sending the message
   * @param packet the packet sent
   */
  onMsg(client: Client, packet: Packet) {
    let packetFactory = PacketFactory.getInstance();

    switch (packet.type) {
      case PacketType.SPAWN:
        if (
          "name" in packet.data[0] &&
          "moofoll" in packet.data[0] &&
          "skin" in packet.data[0]
        ) {
          let player = this.state.players.find(
            (plr) => plr.ownerID === client.id
          );

          if (!player || (player && player.dead)) {
            let newPlayer;

            if (!player) {
              newPlayer = client.player = this.state.addPlayer(
                this.genSID(),
                client.id,
                client,
                this
              );
            } else {
              newPlayer = player;
            }

            this.sendGameObjects(newPlayer);

            newPlayer.location = new Vec2(100, 100);
            newPlayer.name =
              packet.data[0].name > 15 || packet.data[0].name === ""
                ? "unknown"
                : packet.data[0].name;
            newPlayer.skinColor = packet.data[0].skin;
            newPlayer.dead = false;
            newPlayer.health = 100;

            client.socket.send(
              packetFactory.serializePacket(
                new Packet(PacketType.PLAYER_START, [newPlayer.id])
              )
            );

            client.socket.send(
              packetFactory.serializePacket(
                new Packet(PacketType.PLAYER_ADD, [
                  [
                    client.id,
                    newPlayer.id,
                    (this.isModerator(client) ? `\u3010${newPlayer.id}\u3011 ` : '') + newPlayer.name,
                    100,
                    100,
                    0,
                    100,
                    100,
                    35,
                    newPlayer.skinColor,
                  ],
                  true,
                ])
              )
            );

            this.sendPlayerUpdates();

            for (let client of this.clients) {
              let seenIndex = client.seenPlayers.indexOf(newPlayer.id);

              if (seenIndex > -1) client.seenPlayers.splice(seenIndex, 1);
            }
          }
        } else {
          this.kickClient(client, "Malformed spawn packet!");
        }
        break;
      case PacketType.BUY_AND_EQUIP:
        if (packet.data[0] === 1) if (client.player) break;
        break;
      case PacketType.ATTACK:
        if (client.player) {
          if (packet.data[0]) {
            this.normalAttack(client.player);
          } else {
            client.player.isAttacking = false;
          }
        }
        break;
      case PacketType.PLAYER_MOVE:
        if (packet.data[0] === null) {
          if (client.player) client.player.stopMove();
        } else {
          if (client.player) client.player.move(packet.data[0]);
        }
        break;
      case PacketType.SET_ANGLE:
        if (client.player) client.player.angle = packet.data[0];
        break;
      case PacketType.CHAT:
        for (let badWord of badWords) {
          if (packet.data[0].includes(badWord))
            packet.data[0] = packet.data[0].replace(new RegExp(badWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), "M" + "o".repeat(badWord.length - 1));
        }

        if (packet.data[0].startsWith("/")) {
          this.isModerator(client).then(isModerator => isModerator && console.runCommand(packet.data[0].substring(1)));
        } else {
          let chatPacket = packetFactory.serializePacket(
            new Packet(PacketType.CHAT, [client.player?.id, packet.data[0]])
          );

          client.socket?.send(chatPacket);

          if (client.player) {
            for (let player of client.player.getNearbyPlayers(this.state)) {
              player.client?.socket.send(chatPacket);
            }
          }
        }
        break;
      case PacketType.CLAN_CREATE:
        if (client.player) {
          let tribe = this.state.addTribe(packet.data[0], client.player.id);

          if (tribe) {
            client.player.clanName = tribe.name;
            client.player.isClanLeader = true;
            client.socket?.send(
              packetFactory.serializePacket(
                new Packet(PacketType.PLAYER_SET_CLAN, [tribe.name, true])
              )
            );
          }
        }
        break;
      case PacketType.CLAN_REQ_JOIN:
        if (client.player && client.player.clanName === null) {
          let tribe = this.state.tribes.find(
            (tribe) => tribe.name === packet.data[0]
          );

          if (tribe) {
            client.player.clanName = tribe.name;

            if (!tribe.membersSIDs.includes(client.player.id))
              tribe.membersSIDs.push(client.player.id);
          }
        }
        break;
      case PacketType.AUTO_ATK:
        if (client.player)
          if (packet.data[0] == 1)
            client.player.autoAttackOn = !client.player.autoAttackOn;
        break;
      case PacketType.CLAN_NOTIFY_SERVER:
        if (client.player && client.player.clanName) {
          if (Date.now() - client.player.lastPing > 2200) {
            let tribe = this.state.tribes.find(
              (tribe) => tribe.name === client.player?.clanName
            );

            if (tribe) {
              for (let memberSID of tribe.membersSIDs) {
                this.state.players
                  .find((player) => player.id == memberSID)
                  ?.client?.socket.send(
                    packetFactory.serializePacket(
                      new Packet(PacketType.CLAN_NOTIFY_CLIENT, [
                        client.player.location.x,
                        client.player.location.y,
                      ])
                    )
                  );
              }

              client.player.lastPing = Date.now();
            }
          }
        }
        break;
    }
  }
}

function getGame() {
  return currentGame;
}

export { getGame, Game };
