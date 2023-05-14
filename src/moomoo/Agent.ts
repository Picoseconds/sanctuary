// @ts-nocheck
import Entity from "./Entity";
import entities from "./entities.json"
import { randInt } from "./util";
import Vec2 from "vec2";
import Game from "./Game";

var entity_ids:Number[] = [];

entities = entities.reduce(function(map, obj) {
    map[obj.id] = obj;
    entity_ids.push(obj.id)
    return map;
}, {});

export default class Agent extends Entity {

    // 0: 16 # id
    // 1: 4 # agenttype
    // 2: 1761 #posX
    // 3: 4502 #posY
    // 4: 3.46 #rot? cuz float
    // 5: 300 # health
    // 6: 2 # damage?
    
    public spawnCounter: Number = -1;
    public lockMove: Boolean = false;
    public waitCount = 0;
    public active = true;

    constructor(id: number, agenttype: number, location: Vec2, angle: number = 0, velocity: Vec2 = new Vec2(0, 0), game:Game) {
        super(id, location, angle, velocity);
        this.game = game
        this.cowNameIndex = randInt(1,45)-1;
        if (entity_ids.includes(agenttype)){
            this.agent_dat = entities[agenttype];
        } else {
            this.agent_dat = entities[0];
        };
        this.agentType = this.agent_dat.id;
        this.maxHealth = this.agent_dat.health;
        this.health = this.maxHealth;
        let agent_scale = this.agent_dat.scale;
        this.scale = agent_scale ? agent_scale : this.scale; //keep default entity scale if none 
        this.lastDot = 0; //see bundle.js (used for delaying dmgOverTime) (0 by default, every update lastDot-=dt and if negative: apply this.damageOvertime.damage and set to 1second)
    }

    getUpdateData(){
        return [this.id, this.agent_dat.id || 0, this.location.x, this.location.y, this.angle, this.health, this.cowNameIndex]
    }

    public getNearbyGameObjects(state: GameState, includeHidden = false) {
        const RADIUS = process.env.GAMEOBJECT_NEARBY_RADIUS || 1250;
    
        let gameObjects = [];
    
        for (let gameObject of state.gameObjects) {
          if (
            eucDistance(
              [this.location.x, this.location.y],
              [gameObject.location.x, gameObject.location.y]
            ) < RADIUS
          ) {
            if (
              !(gameObject.isPlayerGameObject() &&
                shouldHideFromEnemy(gameObject.data) &&
                gameObject.isEnemy(this, state.tribes) &&
                !this.client?.seenGameObjects.includes(gameObject.id)) || includeHidden
            ) {
              gameObjects.push(gameObject);
            }
          }
        }
    
        return gameObjects;
    }

    respawn(){
        this.spawnCounter = 1000;
        this.location = new Vec2(this.startX || o.randInt(0, this.game.mapWidth), this.startY || o.randInt(0, this.game.mapHeight))
    }

    

    canSee = function(e:Entity) {
        if (!e) return false;
        if (e.skin && e.skin.invisTimer && e.noMovTimer >= e.skin.invisTimer) return false; //if invis
        var t = Math.abs(e.location.x - this.location.x) - e.scale, //distance to edge of circle
            i = Math.abs(e.location.y - this.location.y) - e.scale; //distance to edge of circle
        return t <= this.game.maxScreenWidth / 2 * 1.3 && i <= this.game.maxScreenHeight / 2 * 1.3
    };
}