import Vec2 from "vec2";
import Agent from "./Agent";
import entities from './entities.json';
import GameState from "./GameState";
import Player from "./Player";
import { eucDistance } from "./util";

for (let i = 0; i < entities.length; i++) {
    console.log(JSON.stringify(entities[i]));

}

export default class Entity {
    public id: number;
    public location: Vec2;
    public angle: number;
    public velocity: Vec2;
    public scale: number = 50;
    public zIndex: number = 0;
    public isPlayer: boolean = false;

    constructor(id: number, location: Vec2, angle: number = 0, velocity: Vec2 = new Vec2(0, 0)) {
        this.id = id;
        this.location = location;
        this.angle = angle;
        this.velocity = velocity;
    }

    getNearbyPlayers(state: GameState, except?: Player) {
        const RADIUS = process.env.PLAYER_NEARBY_RADIUS || 1250;

        let players = [];

        for (let player of state.players) {
            if (player!==except && !player.dead) {
                if (
                    eucDistance(
                        [this.location.x, this.location.y],
                        [player.location.x, player.location.y]
                    ) < RADIUS
                ) {
                    players.push(player);
                }
            }
        }

        return players;
    }

    getNearbyAgents(state: GameState, except?:Agent) { //careful this does not handle resetting the agent in case of death, has to be handled accordingly
        const RADIUS = process.env.PLAYER_NEARBY_RADIUS || 1250;

        let agents = [];

        for (let ag of state.agents) {
            if (ag!==except){
                if(
                    eucDistance(
                        [this.location.x, this.location.y],
                        [ag.location.x, ag.location.y]
                    ) < RADIUS
                ) {
                    agents.push(ag);
                }
            }
        }

        return agents;
    }
}