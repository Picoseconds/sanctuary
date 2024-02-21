import Vec2 from "vec2";
import Player from "./Player";
import { Game } from "./Game";
import Client from "./Client";
import { Tribe } from "./Tribes";
import { Packet } from "../packets/Packet";
import { PacketFactory } from "../packets/PacketFactory";
import GameObject from "../gameobjects/GameObject";
import { PacketType } from "../packets/PacketType";
import Projectile from "../projectiles/Projectile";
import { getProjectileSpeed, getProjectileRange } from "../projectiles/projectiles";
import Agent from "./Agent";
import { randInt, randomPos } from "./util";

export default class GameState {
  public game: Game;
  public gameObjects: GameObject[] = [];
  public players: Player[] = [];
  public tribes: Tribe[] = [];
  public projectiles: Projectile[] = [];
  public agents: Agent[] = [];

  constructor(game: Game) {
    this.game = game;
    for(let i=0; i<20; i++){
      this.addAgentSimple(new Vec2(0,7000));
    }
  }

  addProjectile(type: number, location: Vec2, player?: Player, angle = player?.angle, layer = player?.layer) {
    let packetFactory = PacketFactory.getInstance();
    let newProjectile = new Projectile(this.projectiles.length > 0 ? Math.max(...this.projectiles.map((projectile) => projectile.id)) + 1 : 0, location, type, getProjectileSpeed(type) || 1, angle || 0, layer || 0, player?.id || -1);

    this.projectiles.push(newProjectile);

    this.getPlayersNearProjectile(newProjectile).forEach(player => {
      player.client?.socket.send(
        packetFactory.serializePacket(
          new Packet(
            PacketType.ADD_PROJECTILE,
            [location.x, location.y, angle, getProjectileRange(type), getProjectileSpeed(type), type, layer, newProjectile.id]
          )
        )
      );

      player.client?.seenProjectiles.push(newProjectile.id);
    });
  }

  removeProjectile(projectile: Projectile) {
    let packetFactory = PacketFactory.getInstance();

    this.projectiles.splice(this.projectiles.indexOf(projectile), 1);
  }

  getPlayersNearProjectile(projectile: Projectile) {
    const RADIUS = process.env.PLAYER_NEARBY_RADIUS || 1250;
    return this.players.filter(player => !player.dead && player.location.distance(projectile.location) < RADIUS);
  }

  removeGameObject(gameObject: GameObject) {
    let packetFactory = PacketFactory.getInstance();
    this.gameObjects.splice(this.gameObjects.indexOf(gameObject), 1);

    for (let player of this.players) {
      if (player.client && player.client.seenGameObjects.includes(gameObject.id)) {
        player.client.seenGameObjects.splice(player.client.seenGameObjects.indexOf(gameObject.id), 1);
        player.client.socket.send(
          packetFactory.serializePacket(
            new Packet(
              PacketType.REMOVE_GAME_OBJ,
              [gameObject.id]
            )
          )
        );
      }
    }
  }

  joinClan(player: Player, tribe: Tribe) {
    if (!tribe.membersSIDs.includes(player.id))
      tribe.membersSIDs.push(player.id);

    this.updateClanPlayers(tribe);
  }

  updateClanPlayers(tribe: Tribe) {
    let packetFactory = PacketFactory.getInstance();
    let data: (string | number)[] = [];

    for (let memberSID of tribe.membersSIDs) {
      let player = this.players.find(player => player.id == memberSID);
      if (player)
        data.push(player.id, player.name);
    }

    for (let memberSID of tribe.membersSIDs) {
      let player = this.players.find(player => player.id == memberSID);
      let client = player?.client;

      if (client) {
        client.socket.send(
          packetFactory.serializePacket(
            new Packet(PacketType.SET_CLAN_PLAYERS, [data])
          )
        );
      }
    }
  }

  addPlayer(sid: number, ownerID: string, client: Client, game: Game) {
    return this.players[
      this.players.push(new Player(sid, ownerID, new Vec2(0, 0), game, client)) - 1
    ];
  }

  // 0: 16 # id
  // 1: 4 # agenttype
  // 2: 1761 #posX
  // 3: 4502 #posY
  // 4: 3.46 #rot? cuz float
  // 5: 300 # health
  // 6: 2 # damage?
  addAgentSimple(pos?:Vec2){
    if (typeof pos === "undefined"){
      pos = randomPos(this.game.mapScale, this.game.mapScale);
    };
    return this.addAgent(this.agents.length, randInt(3,6),pos, Math.random()*Math.PI*2, this.game);
  }

  addAgent(sid: number, agenttype:number, pos:Vec2, dir:number, game: Game) {
    if (!pos){
      pos=randomPos(this.game.mapScale, this.game.mapScale);
    }
    return this.agents[
      this.agents.push(new Agent(sid, agenttype, pos, Math.random()*Math.PI, new Vec2(0,0), this.game))
      // this.agents.push(new Agent(this.agents.length,  randInt(0,5), , Math.random()*Math.PI, new Vec2(0,0)))
    ];
  }

  addTribe(name: string, ownerSID: number) {
    if (this.tribes.find(tribe => tribe.name == name || tribe.ownerSID == ownerSID))
      return false;

    let packetFactory = PacketFactory.getInstance();

    for (let client of this.game.clients) {
      client.socket?.send(packetFactory.serializePacket(new Packet(PacketType.CLAN_ADD, [{ sid: name }])));
    }

    return this.tribes[
      this.tribes.push({ name: name, ownerSID: ownerSID, membersSIDs: [ownerSID] }) - 1
    ];
  }

  removeTribe(tribeIndex: number) {
    let packetFactory = PacketFactory.getInstance();
    let tribe = this.tribes[tribeIndex];

    if (tribe) {
      for (let client of this.game.clients) {
        client.socket?.send(packetFactory.serializePacket(new Packet(PacketType.CLAN_DEL, [tribe.name])));
      }

      for (let memberSID of tribe.membersSIDs) {
        let player = this.players.find(player => player.id == memberSID);
        let client = player?.client;

        if (player)
          player.clanName = null;

        if (client) {
          client.socket.send(
            packetFactory.serializePacket(
              new Packet(PacketType.PLAYER_SET_CLAN, [null, 0])
            )
          );

          if (client.player)
            client.player.isClanLeader = false;
        }
      }

      this.tribes.splice(tribeIndex, 1);
    }
  }

  leaveClan(player: Player, tribeIndex: number) {
    let packetFactory = PacketFactory.getInstance();
    let client = player?.client;

    this.tribes[tribeIndex].membersSIDs = this.tribes[tribeIndex].membersSIDs.filter(
      memberSID => memberSID != player.id
    );

    if (player)
      player.clanName = null;

    if (client) {
      client.socket.send(
        packetFactory.serializePacket(
          new Packet(PacketType.PLAYER_SET_CLAN, [null, 0])
        )
      );

      if (client.player)
        client.player.isClanLeader = false;
    }

    this.updateClanPlayers(this.tribes[tribeIndex]);
  }
}
