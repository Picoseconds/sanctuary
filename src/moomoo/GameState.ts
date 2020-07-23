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
      this.tribes.push({name: name, ownerSID: ownerSID, membersSIDs: [ownerSID]}) - 1
    ];
  }
}
