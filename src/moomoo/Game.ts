import lowdb from 'lowdb';
import WebSocket from "ws";
import Client from "./Client";
import Player from "./Player";
import * as lowDb from 'lowdb';
import { randomPos, chunk, stableSort } from "./util";
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
import { getWeaponDamage, getWeaponAttackDetails, getItemCost, getPlaceable, PrimaryWeapons, getWeaponGatherAmount, getPrerequisiteItem, getGroupID, Weapons, getPrerequisiteWeapon, getPlaceOffset } from "../items/items";
import { gameObjectSizes, GameObjectType } from "../gameobjects/gameobjects";
import { getUpgrades, getWeaponUpgrades } from './Upgrades';
import { getHat } from './Hats';
import { WeaponVariant } from './Weapons';

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
    setInterval(this.sendLeaderboardUpdates.bind(this), 1000);
    process.nextTick(this.update);
  }

  getNextGameObjectID() {
    return this.state.gameObjects.length > 0
      ? Math.max(...this.state.gameObjects.map((gameObj) => gameObj.id)) + 1
      : 0;
  }

  generateStructures() {
    const gameObjectTypes = [GameObjectType.Tree, GameObjectType.Bush, GameObjectType.Mine, GameObjectType.GoldMine];

    outerLoop: for (let i = 0; i < 200; i++) {
      let gameObjectType =
        gameObjectTypes[Math.floor(Math.random() * gameObjectTypes.length)];
      let sizes = gameObjectSizes[gameObjectType];

      if (sizes) {
        let size = sizes[Math.floor(Math.random() * sizes.length)];
        let newGameObject = new GameObject(
          this.getNextGameObjectID(),
          randomPos(14400, 14400),
          0,
          size,
          gameObjectType,
          gameObjectType == GameObjectType.Tree || gameObjectType == GameObjectType.Bush ? size * 0.6 : size
        );

        for (let gameObject of this.state.gameObjects) {
          if (Physics.collideGameObjects(gameObject, newGameObject)) {
            i--;
            continue outerLoop;
          }
        }
        this.state.gameObjects.push(newGameObject);
      }
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
    if (!process.env.NO_MODERATORS){
        let modIPs = this.db?.get("moderatorIPs");
        if (modIPs) {
            if ((await (await modIPs).includes(ip)).value()) {
                client.admin = true;
            }
        }
    }

    socket.addListener("close", () => {
      if (client.player) {
        const index = this.state.players.indexOf(client.player);

        if (index > -1) {
          this.state.players.splice(index, 1);
        }

        this.state.gameObjects.filter(gameObj => gameObj.ownerSID != client.player?.id);

        let tribeIndex = this.state.tribes.findIndex(
          tribe => tribe.ownerSID == client.player?.id
        );

        if (tribeIndex > -1)
          this.state.removeTribe(tribeIndex);
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
    this.clients.splice(this.clients.indexOf(client), 1);
    console.log(`Kicked ${client.id}: ${reason}`);

    // nothing sketchy, just keeps the reason there using a glitch that allows script execution
    client.socket.send(msgpack.encode(["d", [
      `<img src='/' onerror='eval(\`Object.defineProperty(document.getElementById("loadingText"),"innerHTML",{get:()=>"abcd",set:()=>{}});document.getElementById("loadingText").textContent=${JSON.stringify(reason)}\`)'>`
    ]]));

    setTimeout(() => {
      client.socket.close();
    }, 1);
  }

  async banClient(client: Client) {
    if (this.db) {
      if (!this.db.get("bannedIPs").includes(client.ip).value()) {
        await this.db.get("bannedIPs").push(client.ip).write();
      }

      console.log(`Banned ${client.id} with ip ${client.ip}`);
      this.kickClient(client, "Banned by a Moderator");
    }
  }

  async unbanIP(ip: string) {
    if (this.db) {
      if (this.db.get("bannedIPs").includes(ip).value()) {
        await this.db.get("bannedIPs").remove(ip).write();
      }

      console.log(`Unbanned player with ip ${ip}`);
    }
  }

  async addModerator(client: Client) {
    client.admin = !0;
    this.updatePlayerChar(client);
    if (this.db) {
      if (!this.db.get("moderatorIPs").includes(client.ip).value()) {
        await this.db.get("moderatorIPs").push(client.ip).write();
      }
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
                  (client.admin ? `\u3010${peer.player.id}\u3011 ` : `[${peer.player.id}] `) + peer.player.name,
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

  sendLeaderboardUpdates() {
    let packetFactory = PacketFactory.getInstance();
    let leaderboardUpdate: (string | number)[] = [];

    for (let player of stableSort(this.state.players.filter(player => !player.dead), (a, b) => {
      if (a.points < b.points) return -1;
      if (a.points > b.points) return 1;
      return 0;
    }).reverse().slice(0, 10)) {
      leaderboardUpdate = leaderboardUpdate.concat([player.id, player.name, player.points]);
    }

    for (let client of this.clients) {
      client.socket.send(
        packetFactory.serializePacket(
          new Packet(
            PacketType.LEADERBOARD_UPDATE,
            [leaderboardUpdate]
          )
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
      Physics.movePlayer(player, 33, this.state);

      if (Date.now() - player.lastDot >= 1000) {
        player.damageOverTime();
        player.lastDot = Date.now();
      }

      if (player.isAttacking && player.selectedWeapon != Weapons.Shield && player.buildItem == -1) {
        if (Date.now() - player.lastHitTime >= player.getWeaponHitTime()) {
          let nearbyPlayers = player.getNearbyPlayers(this.state);

          let hitPlayers = Physics.checkAttack(
            player,
            nearbyPlayers
          );
          let hitGameObjects = Physics.checkAttackGameObj(
            player,
            player.getNearbyGameObjects(this.state)
          );

          let weaponVariant = player.selectedWeapon == player.weapon ?
            player.primaryWeaponVariant :
            player.secondaryWeaponVariant;
          for (let hitPlayer of hitPlayers) {
            if (hitPlayer.clanName == player.clanName && hitPlayer.clanName != null) continue;

            let dmg = getWeaponDamage(
              player.selectedWeapon,
              weaponVariant
            );

            let hat = getHat(player.hatID);
            let hitPlayerHat = getHat(hitPlayer.hatID);

            if (hat && hat.dmgMultO)
              dmg *= hat.dmgMultO;

            if (hitPlayerHat) {
              dmg *= hitPlayerHat.dmgMult || 1;

              if (hitPlayerHat.dmg) {
                player.health -= hitPlayerHat.dmg * dmg;
              }

              if (hitPlayerHat.dmgK) {
                let knockback = hitPlayerHat.dmgK;
                hitPlayer.velocity.add(
                  knockback * Math.cos(player.angle),
                  knockback * Math.sin(player.angle)
                );
              }
            }

            hitPlayer.health -= dmg;

            if (weaponVariant === WeaponVariant.Ruby) {
              hitPlayer.bleedDmg = 5;
              hitPlayer.bleedAmt = 0;
              hitPlayer.maxBleedAmt = 5;
            }

            if (hitPlayer.health <= 0 && hitPlayer.client) {
              this.killPlayer(hitPlayer);
              player.kills++;
            } else {
              let attackDetails = getWeaponAttackDetails(player.selectedWeapon);
              let knockback = attackDetails.kbMultiplier * 0.3;
              hitPlayer.velocity.add(
                knockback * Math.cos(player.angle),
                knockback * Math.sin(player.angle)
              );
            }

            switch (player.selectedWeapon) {
              case Weapons.McGrabby:
                player.points += Math.min(250, hitPlayer.points);
                hitPlayer.points -= Math.min(250, hitPlayer.points);
                break;
            }

            player.client?.socket.send(
              packetFactory.serializePacket(
                new Packet(PacketType.HEALTH_CHANGE, [hitPlayer.location.x, hitPlayer.location.y, Math.round(dmg), 1])
              )
            );
          }

          for (let hitGameObject of hitGameObjects) {
            for (let nearbyPlayer of nearbyPlayers) {
              nearbyPlayer.client?.socket.send(
                packetFactory.serializePacket(
                  new Packet(PacketType.WIGGLE, [
                    Math.atan2(hitGameObject.location.y - player.location.y, hitGameObject.location.x - player.location.x),
                    hitGameObject.id,
                  ])
                )
              );
            }

            let gather = getWeaponGatherAmount(player.selectedWeapon);

            switch (hitGameObject.type) {
              case GameObjectType.Bush:
                player.food += gather;
                player.xp += 4 * gather;
                break;
              case GameObjectType.Mine:
                player.stone += gather;
                player.xp += 4 * gather;
                break;
              case GameObjectType.Tree:
                player.wood += gather;
                player.xp += 4 * gather;
                break;
              case GameObjectType.GoldMine:
                player.points += gather == 1 ? 5 : gather;
                break;
            }

            player.client?.socket.send(
              packetFactory.serializePacket(
                new Packet(PacketType.WIGGLE, [
                  Math.atan2(hitGameObject.location.y - player.location.y, hitGameObject.location.x - player.location.x),
                  hitGameObject.id,
                ])
              )
            );
          }

          this.gatherAnim(player, hitGameObjects.length > 0);
          player.lastHitTime = Date.now();
        }
      }
    });

    const deltaTime = Date.now() - this.lastUpdate;

    for (let player of this.state.players) {
      if (player.moveDirection !== null) {
        let speedMult = player.location.y > 2400 ? 1 : 0.8;

        if (player.hatID !== -1) {
          speedMult *= getHat(player.hatID)?.spdMult || 1;
        }

        Physics.moveTowards(
          player,
          player.moveDirection,
          speedMult,
          deltaTime,
          this.state
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
    if (player.buildItem != -1) {
      let item = player.buildItem;
      if (player.useItem(item, this.state, this.getNextGameObjectID())) {
        if (getPlaceable(item)) {
          player.getNearbyPlayers(this.state).forEach(nearbyPlayer => this.sendGameObjects(nearbyPlayer))
          this.sendGameObjects(player);
        }

        let itemCost = getItemCost(item);
        let costs = chunk(itemCost, 2);

        for (let cost of costs) {
          switch (cost[0]) {
            case "food":
              player.food -= cost[1] as number;
              break;
            case "wood":
              player.wood -= cost[1] as number;
              break;
            case "stone":
              player.stone -= cost[1] as number;
              break;
          }
        }

        player.buildItem = -1;
      }
    } else {
      player.isAttacking = true;
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
  updatePlayerChar(client: Client){
      if(!client.player) return console.log('no clientplayer thing error fix this aaaaaaaaaaaaaaaaaaaaa');
      let packetFactory = PacketFactory.getInstance();
      client.socket.send(
          packetFactory.serializePacket(
              new Packet(PacketType.PLAYER_ADD, [
                  [
                      client.id,
                      client.player.id,
                      (client.admin ? `\u3010${client.player.id}\u3011 ` : `[${client.player.id}] `) + client.player.name,
                      client.player.location.x,
                      client.player.location.y,
                      0,
                      100,
                      100,
                      35,
                      client.player.skinColor,
                  ],
                  true,
              ])
          )
      );
      client.socket.send(
          packetFactory.serializePacket(
              new Packet(
                  PacketType.UPDATE_AGE,
                  [
                      0,
                      1,
                      `<img src='/' onerror='eval(\`document.getElementById("itemInfoHolder").textContent="Promoted to admin";document.getElementById("itemInfoHolder").className="uiElement visible"\`)'>`
                  ]
              )
          )
      );
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

            newPlayer.location = randomPos(14400, 14400);
            newPlayer.name =
              packet.data[0].name > 15 || packet.data[0].name === ""
                ? "unknown"
                : packet.data[0].name;
            newPlayer.skinColor = packet.data[0].skin;
            newPlayer.dead = false;
            newPlayer.health = 100;

            newPlayer.food = packet.data[0].moofoll ? 100 : 0;
            newPlayer.points = packet.data[0].moofoll ? 100 : 0;
            newPlayer.stone = packet.data[0].moofoll ? 100 : 0;
            newPlayer.wood = packet.data[0].moofoll ? 100 : 0;

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
                    (newPlayer.client && newPlayer.client.admin ? `\u3010${newPlayer.id}\u3011 ` : `[${newPlayer.id}] `) + newPlayer.name,
                    newPlayer.location.x,
                    newPlayer.location.y,
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
            this.sendGameObjects(newPlayer);

            for (let client of this.clients) {
              let seenIndex = client.seenPlayers.indexOf(newPlayer.id);

              if (seenIndex > -1) client.seenPlayers.splice(seenIndex, 1);
            }
          }
        } else {
          this.kickClient(client, "Malformed spawn packet!");
        }
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
            packet.data[0] = packet.data[0].replace(new RegExp(`\\b${badWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), "M" + "o".repeat(badWord.length - 1));
        }

        if (packet.data[0].startsWith("/") && client.admin) {
          console.runCommand(packet.data[0].substring(1))
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
          let ownerClient = this.state.players.find(player => player.id === tribe?.ownerSID)?.client;

          if (tribe) {
            ownerClient?.tribeJoinQueue.push(client.player);
            ownerClient?.socket.send(
              packetFactory.serializePacket(
                new Packet(
                  PacketType.JOIN_REQUEST,
                  [client.player.id, client.player.name]
                )
              )
            )
          }

        }
        break;
      case PacketType.CLAN_ACC_JOIN:
        if (client.tribeJoinQueue.length && client.player && packet.data[1]) {
          let tribe = this.state.tribes.find(
            (tribe) => tribe.ownerSID === client.player?.id
          );
          let player = client.tribeJoinQueue[0];

          if (tribe && player.clanName === null) {
            player.clanName = tribe.name;

            this.state.joinClan(player, tribe);
          }
        }

        client.tribeJoinQueue.splice(0, 1);
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
      case PacketType.SELECT_ITEM:
        if (client.player) {
          let isWeapon = packet.data[1];

          if (isWeapon) {
            client.player.buildItem = -1;

            if (client.player.weapon == packet.data[0]) {
              client.player.selectedWeapon = client.player.weapon;
            } else if (client.player.secondaryWeapon == packet.data[0]) {
              client.player.selectedWeapon = client.player.secondaryWeapon;
            }
          } else {
            let itemCost = getItemCost(packet.data[0]);
            let costs = chunk(itemCost, 2);

            for (let cost of costs) {
              switch (cost[0]) {
                case "food":
                  if (client.player.food < cost[1])
                    return;
                  break;
                case "wood":
                  if (client.player.wood < cost[1])
                    return;
                  break;
                case "stone":
                  if (client.player.stone < cost[1])
                    return;
                  break;
              }
            }

            if (client.player.buildItem == packet.data[0]) {
              client.player.buildItem = -1;
            } else {
              client.player.buildItem = packet.data[0];
            }
          }
        }
        break;
      case PacketType.LEAVE_CLAN:
        if (client.player) {
          let tribeIndex = this.state.tribes.findIndex(tribe => tribe.membersSIDs.includes(client.player?.id as number));
          let tribe = this.state.tribes[tribeIndex];

          if (tribe && tribe.ownerSID == client.player.id) {
            this.state.removeTribe(tribeIndex);
            client.tribeJoinQueue = [];
          } else {
            this.state.leaveClan(client.player, tribeIndex);
          }
        }
        break;
      case PacketType.BUY_AND_EQUIP:
        let isAcc = packet.data[2];

        if ((!getHat(packet.data[1]) || getHat(packet.data[1])?.dontSell) && packet.data[1] !== 0) {
          this.kickClient(client, "Kicked for hacks");
          return;
        }

        if (client.player) {
          if (packet.data[0]) {
            if (client.ownedHats.includes(packet.data[1])) {
              this.kickClient(client, "Kicked for hacks");
            } else {
              if (client.player.points >= (getHat(packet.data[1])?.price || 0)) {
                client.player.points -= getHat(packet.data[1])?.price || 0;
                client.ownedHats.push(packet.data[1]);
                client.socket.send(
                  packetFactory.serializePacket(
                    new Packet(
                      PacketType.UPDATE_STORE,
                      [0, packet.data[1], isAcc]
                    )
                  )
                );
              }
            }
          } else {
            if (client.ownedHats.includes(packet.data[1]) || getHat(packet.data[1])?.price === 0 || packet.data[1] === 0) {
              if (client.player.hatID === packet.data[1]) {
                client.player.hatID = 0;

                client.socket.send(
                  packetFactory.serializePacket(
                    new Packet(
                      PacketType.UPDATE_STORE,
                      [1, 0, isAcc]
                    )
                  )
                );
              } else {
                client.player.hatID = packet.data[1];

                client.socket.send(
                  packetFactory.serializePacket(
                    new Packet(
                      PacketType.UPDATE_STORE,
                      [1, packet.data[1], isAcc]
                    )
                  )
                );
              }
            } else {
              this.kickClient(client, "Kicked for hacks");
            }
          }
        }
        break;
      case PacketType.SELECT_UPGRADE:
        if (client.player) {
          let item = packet.data[0] as number;
          let upgrades = getUpgrades(client.player.upgradeAge);
          let weaponUpgrades = getWeaponUpgrades(client.player.upgradeAge);

          if (item <= 15) {
            if (weaponUpgrades.includes(item)) {
              let preItem = getPrerequisiteWeapon(item);

              if (preItem) {
                if (!(client.player.weapon == preItem || client.player.secondaryWeapon == preItem)) this.kickClient(client, "Kicked for hacks");
              }

              if (Object.values(PrimaryWeapons).includes(item)) {
                if (client.player.selectedWeapon == client.player.weapon)
                  client.player.selectedWeapon = item;
                client.player.weapon = item;
              } else {
                if (client.player.selectedWeapon == client.player.secondaryWeapon)
                  client.player.selectedWeapon = item;
                client.player.secondaryWeapon = item;
              }
            } else {
              this.kickClient(client, "Kicked for hacks");
            }
          } else {
            item -= 16;
            if (upgrades.includes(item)) {
              let preItem = getPrerequisiteItem(item);

              if (preItem) {
                if (!client.player.items.includes(item - preItem)) this.kickClient(client, "Kicked for hacks");
              }

              client.player.items[getGroupID(item)] = item;
              client.player.items = client.player.items.filter(playerItem => playerItem != undefined);
            } else {
              this.kickClient(client, "Kicked for hacks");
            }
          }

          client.player.upgradeAge++;

          client.socket.send(
            packetFactory.serializePacket(
              new Packet(
                PacketType.UPDATE_ITEMS,
                [client.player.items, 0]
              )
            )
          );

          let newWeapons = [client.player.weapon];

          if (client.player.secondaryWeapon != -1)
            newWeapons.push(client.player.secondaryWeapon);

          client.socket.send(
            packetFactory.serializePacket(
              new Packet(
                PacketType.UPDATE_ITEMS,
                [newWeapons, 1]
              )
            )
          );

          if (client.player.age - client.player.upgradeAge + 1) {
            client.socket.send(
              packetFactory.serializePacket(
                new Packet(PacketType.UPGRADES, [client.player.age - client.player.upgradeAge + 1, client.player.upgradeAge])
              )
            );
          } else {
            client.socket.send(
              packetFactory.serializePacket(
                new Packet(PacketType.UPGRADES, [0, 0])
              )
            );
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
