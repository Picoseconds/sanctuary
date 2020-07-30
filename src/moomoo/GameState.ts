import Vec2 from "vec2";
import Player from "./Player";
import { Game } from "./Game";
import Client from "./Client";
import { Tribe } from "./Tribes";
import { Packet } from "../packets/Packet";
import { PacketFactory } from "../packets/PacketFactory";
import GameObject from "../gameobjects/GameObject";
import { PacketType } from "../packets/PacketType";

export default class GameState {
  public game: Game;
  public gameObjects: GameObject[] = [];
  public players: Player[] = [];
  public tribes: Tribe[] = [];

  constructor(game: Game) {
    this.game = game;
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
