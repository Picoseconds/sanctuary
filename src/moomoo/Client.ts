import WebSocket from "ws";
import Player from "./Player";

export default class Client {
  public tribeJoinQueue: Player[] = [];
  public seenProjectiles: number[] = [];
  public lastAttackTime = 0;

  constructor(
    public id: string,
    public socket: WebSocket,
    public ip: string,
    public seenPlayers: number[] = [],
    public seenGameObjects: number[] = [],
    public player: Player | null = null,
    public ownedHats: number[] = [],
    public ownedAccs: number[] = [],
    public admin: boolean = false
  ) {}
}
