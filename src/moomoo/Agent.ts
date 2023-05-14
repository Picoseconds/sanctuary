// @ts-nocheck
import Entity from "./Entity";
import entities from "./entities.json"
import { randInt, randFloat, eucDistance, getAngle } from "./util";
import Vec2 from "vec2";
import Game from "./Game";

var entity_ids: Number[] = [];

entities = entities.reduce(function (map, obj) {
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
    game: Game;
    cowNameIndex: number;
    spawnCounter: Number = -1;
    lockMove: boolean = false;
    waitCount: number = 1;
    moveCount: number = 0;
    active: boolean = true;
    targetAngle: number = 0;
    turnSpeed: number = 1;
    speed: number = 0.8;
    viewRange: number;

    maxHealth: number = 10;
    health: number = 10;
    agent_dat: object;

    constructor(id: number, agenttype: number, location: Vec2, angle: number = 0, velocity: Vec2 = new Vec2(0, 0), game: Game) {
        super(id, location, angle, velocity);
        this.game = game;
        this.cowNameIndex = randInt(1, 45) - 1;
        
        if (entity_ids.includes(agenttype)) {
            this.agent_dat = entities[agenttype];
        } else {
            this.agent_dat = entities[0];
        };
        this.agentType = this.agent_dat.id;
        this.maxHealth = this.agent_dat.health;
        this.chargePlayer = !!this.agent_dat.chargePlayer
        
        this.turnSpeed = this.agent_dat.turnSpeed || this.turnSpeed;
        this.speed = this.agent_dat.speed || this.speed
        this.health = this.maxHealth;
        this.targetAngle = 0;
        this.viewRange = this.agent_dat.viewRange;
        let agent_scale = this.agent_dat.scale;
        this.scale = agent_scale ? agent_scale : this.scale; //keep default entity scale if none 
        this.lastDot = 0; //see bundle.js (used for delaying dmgOverTime) (0 by default, every update lastDot-=dt and if negative: apply this.damageOvertime.damage and set to 1second)
    }

    getUpdateData() {
        return [this.id, this.agent_dat.id || 0, this.location.x, this.location.y, this.angle, this.health, this.cowNameIndex]
    }

    update(game: Game, deltaTime: number) {
        var can_attack = false;
        var speedMultiplier = 1;

        //river
        if (!this.zIndex //the ai is not elevated on a platform
            && !this.lockMove //the ai is allowed to move
        ) {
            if (this.y >= game.mapScale / 2 - game.riverWidth / 2 //below top river line
                && this.y <= game.mapScale / 2 + game.riverWidth / 2) {//over bottom river line
                speedMultiplier = .33;
                this.velocity.add(game.waterCurrent * deltaTime, 0);//then set speed slower and accelerate right
            }
        }

        if (this.lockMove) { //then if the ai cannot move (see comma operator js)
            this.velocity.set(0, 0);
        } else if (this.waitCount > 0) {
            //ai state of waiting, find a goal!!!
            this.waitCount -= deltaTime;
            if (this.waitCount <= 0) {
                
                if (this.chargePlayer) {
                    let selectedTarget;
                    let selectedDistance:number;
                    for (let playerIndex = 0; playerIndex < game.state.players.length; ++playerIndex) {

                        let player = game.state.players[playerIndex];
                        let d = eucDistance(
                            [this.location.x, this.location.y],
                            [player.location.x, player.location.y]
                        );

                        if (!player.dead && !(player.hatId && getHat(player.hatId).bullRepel)) {
                            if (d <= this.viewRange && (!selectedTarget || d < selectedDistance)) {
                                selectedDistance = d;
                                selectedTarget = player;
                            }
                        }
                    };
                    if (selectedTarget) {
                        this.chargeTarget = selectedTarget;
                        this.moveCount = randInt(8e3, 12e3);
                    } else {
                        this.moveCount = randInt(1e3, 2e3);
                        this.targetAngle = randFloat(-Math.PI, Math.PI);
                    };

                } else {
                    this.moveCount = randInt(4e3, 1e4);
                    
                    this.targetAngle = randFloat(-Math.PI, Math.PI);
                };
                // this.targetAngle = 0;
                    
            };
        } else if (this.moveCount > 0) {
            this.moveCount -= deltaTime; //remove moving time
            
            
             //wait if your moving time has ended
             if (this.moveCount <= 0) {
                this.runFrom = undefined;
                this.chargeTarget = undefined;
                this.waitCount = this.agent_dat.hostile ? 1500 : randInt(1500, 6e3);
            }

            //ai state of moving
            var calc_speed = this.speed * speedMultiplier;
            if (this.runFrom && ((this.runFrom.active && !this.runFrom.isPlayer) || !this.runFrom?.dead)) {
                this.targetAngle = this.runFrom.location.angleTo(this.location);
                calc_speed *= 1.42;
            } else if (this.chargeTarget && !this.chargeTarget.dead) {
                this.targetAngle = Math.atan2(this.chargeTarget.location.y-this.location.y, this.chargeTarget.location.x-this.location.x);
                calc_speed *= 1.75;
                can_attack = true;
                if (this.hitWait) {
                    calc_speed *= .3;
                }
            }
            let i: number = Math.PI * 2;
            if (this.angle != this.targetAngle) {
                this.angle %= i; //mod 2pi
                let rawdelta: number = (this.angle - this.targetAngle + i) % i; //mod 2pi (get some sort of delta to target)
                let m: number = Math.min(Math.abs(rawdelta - i), rawdelta, this.turnSpeed * deltaTime); //then calculate the minimum distance to turn (maximum then being turnspeed)
                let y: number = rawdelta - Math.PI >= 0 ? 1 : -1; //finally get a multiplier for the direction to turn
                this.angle += y * m + i //change the direction (no idea why add 2pi???)
            }
            this.angle %= i; //make sure it's clamped between 0 and 2pi

            this.velocity.add(calc_speed * deltaTime * Math.cos(this.angle), calc_speed * deltaTime * Math.sin(this.angle));
            
        };

        this.velocity.multiply(Math.pow(game.playerDecel, deltaTime), Math.pow(game.playerDecel, deltaTime))

        this.location.add(this.velocity.x * deltaTime, this.velocity.y * deltaTime);
        this.location.clamp(new Vec2(this.scale / 2, this.scale / 2), new Vec2(game.mapScale - this.scale / 2, game.mapScale - this.scale / 2));

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

    getNearbyAgents(state: GameState) {
        return super.getNearbyAgents(state, this);
    }

    respawn() {
        this.spawnCounter = 1000;
        this.location = new Vec2(this.startX || randInt(0, this.game.mapWidth), this.startY || randInt(0, this.game.mapHeight))
    }



    canSee = function (e: Entity) {
        if (!e) return false;
        if (e.skin && e.skin.invisTimer && e.noMovTimer >= e.skin.invisTimer) return false; //if invis
        var t = Math.abs(e.location.x - this.location.x) - e.scale, //distance to edge of circle
            i = Math.abs(e.location.y - this.location.y) - e.scale; //distance to edge of circle
        return t <= this.game.maxScreenWidth / 2 * 1.3 && i <= this.game.maxScreenHeight / 2 * 1.3
    };
}