// @ts-nocheck
import Entity from "./Entity";
import entities from "./entities.json"
import { randInt, randFloat, eucDistance, getAngle, randomPos } from "./util";
import Vec2 from "vec2";
import Game from "./Game";
import { ItemType } from "../items/UpgradeItems";
import GameObject from "../gameobjects/GameObject";
import {shouldHideFromEnemy} from "../items/items"

import { Packet } from "../packets/Packet";
import { PacketFactory } from "../packets/PacketFactory";
import { PacketType } from "../packets/PacketType";

var entity_ids: Number[] = [];

entities = entities.reduce(function (map, obj) {
    map[obj.id] = obj;
    entity_ids.push(obj.id)
    return map;
}, {});

function collideCircles(pos1: Vec2, r1: number, pos2: Vec2, r2: number) {
    return pos1.distance(pos2) <= r1 + r2;
  }

function collideAgentGameObject(agent: Agent, gameObj: GameObject) {
    return collideCircles(agent.location, agent.scale, gameObj.location, gameObj.data === ItemType.PitTrap ? 0.3 * gameObj.realScale : gameObj.realScale);
  }

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
        let dT = 1000*deltaTime;
        let can_attack = false;
        let speedMultiplier = 1;

        //river
        if (!this.zIndex //the ai is not elevated on a platform
            && !this.lockMove //the ai is allowed to move
        ) {
            if (this.y >= game.mapScale / 2 - game.riverWidth / 2 //below top river line
                && this.y <= game.mapScale / 2 + game.riverWidth / 2) {//over bottom river line
                speedMultiplier = .33;
                this.velocity.add(game.waterCurrent * dT, 0);//then set speed slower and accelerate right
            }
        }

        if (this.lockMove) {
            this.velocity.set(0, 0);
        } else if (this.waitCount > 0) {
            //ai state of waiting, find a goal!!!
            this.waitCount -= dT;
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
                        this.moveCount = randInt(3e3, 3e3);
                        this.targetAngle = randFloat(-Math.PI, Math.PI);
                    };

                } else {
                    this.moveCount = randInt(4e3, 1e4);
                    
                    this.targetAngle = randFloat(-Math.PI, Math.PI);
                };
                // this.targetAngle = 0;
                    
            };
        } else if (this.moveCount > 0) {
            this.moveCount -= dT; //remove moving time
            
            
             //wait if your moving time has ended
             if (this.moveCount <= 0) {
                this.runFrom = undefined;
                this.chargeTarget = undefined;
                this.waitCount = (this.agent_dat.hostile ? 1500 : randInt(1500, 6e3));
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
                let m: number = Math.min(Math.abs(rawdelta - i), rawdelta, this.turnSpeed * dT / 20); //then calculate the minimum distance to turn (maximum then being turnspeed)
                let y: number = rawdelta - Math.PI >= 0 ? 1 : -1; //finally get a multiplier for the direction to turn
                this.angle += y * m + i //change the direction (no idea why add 2pi???)
            }
            this.angle %= i; //make sure it's clamped between 0 and 2pi

            this.velocity.add(calc_speed * dT / 20 * Math.cos(this.angle), calc_speed * dT / 20 * Math.sin(this.angle));
            
        };

        

        this.tryMoveSmart(dT, game, can_attack);

        // this.location.add(this.velocity.x * deltaTime, this.velocity.y * deltaTime);
        // this.location.clamp(new Vec2(this.scale / 2, this.scale / 2), new Vec2(game.mapScale - this.scale / 2, game.mapScale - this.scale / 2));

    }

     public checkCollision(object:GameObject, location:Vec2) {
        let i =1;
        
        let scaletot = this.scale + object.scale;

        let distance = location.distance(object.location) - scaletot;

        if (distance<0){
            if (object.ignoreCollision){

            }else{
                let f = Math.atan2(location.y - object.location.y, location.x - object.location.x);

                if (object.isPlayerGameObject()){
                    distance = -1 * distance / 2;
                    location.add(distance * Math.cos(f), distance * Math.sin(f))
                    object.location.subtract( distance * Math.cos(f), distance * Math.sin(f));
                } else{
                    location = new Vec2(object.location.x + scaletot * Math.cos(f), object.location.y + scaletot * Math.sin(f));
                    if(object.dmg && false) {
                        
                        this.changeHealth(-object.dmg, object.owner, object);
                        var p = 1.5 * (object.data.weightM || 1);
                        this.velocity.add(p*Math.cos(f),p * Math.sin(f));
                        // !object.pDmg || this.skin && this.skin.poisonRes || (this.dmgOverTime.dmg = object.pDmg, this.dmgOverTime.time = 5, this.dmgOverTime.doer = object.owner), this.colDmg && object.health && (object.changeHealth(-this.colDmg) && this.disableObj(object), this.hitObj(object, r.getDirection(this.x, this.y, object.x, object.y)))
                    }
                }
            }
        }
        return location;
            
        if (Math.abs(dx) <= scaletot && Math.abs(dy) <= scaletot) {
            // scaletot = this.scale + (object.getScale ? object.getScale() : object.realScale);
            let distance = Math.sqrt(dx**2 + dy**2) - scaletot;
            if (distance <= 0) {
                //we are intersecting
                if (object.ignoreCollision){
                    switch (object.data){
                        case ItemType.PitTrap:
                            if (!this.agent_dat.noTrap){
                                inTrap = true;
                            }
                            break;

                        case ItemType.BoostPad:
                            this.velocity.add(
                                object.boostSpeed * (object.data.weightM || 1) * Math.cos(object.dir),
                                object.boostSpeed * (object.data.weightM || 1) * Math.sin(object.dir)
                            );
                            break;
                            // object.healCol ? this.healCol = object.healCol 
                        case ItemType.Teleporter:
                            this.location = randomPos()
                            break;
                    }
                } else{
                    // var f = r.getDirection(this.x, this.y, object.x, object.y);
                    var f = object.location.angleTo(location);
                    // var dist =  location.distance(object.location);
                    if (object.isPlayer){
                        distance = -1 * distance / 2;
                        location.add(distance * Math.cos(f), distance * Math.sin(f))
                        object.location.subtract( distance * Math.cos(f), distance * Math.sin(f));
                    } else{
                        location = new Vec2(object.location.x + scaletot * Math.cos(f), object.location.y + scaletot * Math.sin(f));
                        if(object.dmg) {
                            this.changeHealth(-object.dmg, object.owner, object);
                            var p = 1.5 * (object.data.weightM || 1);
                            this.velocity.add(p*Math.cos(f),p * Math.sin(f));
                            // !object.pDmg || this.skin && this.skin.poisonRes || (this.dmgOverTime.dmg = object.pDmg, this.dmgOverTime.time = 5, this.dmgOverTime.doer = object.owner), this.colDmg && object.health && (object.changeHealth(-this.colDmg) && this.disableObj(object), this.hitObj(object, r.getDirection(this.x, this.y, object.x, object.y)))
                        }
                    }
                }
            }
        }
        return location
    }

    public tryMoveSmart(deltaTime: number, game:Game){

        let inTrap = false;

        (this.spikeHit > 0 && --this.spikeHit < 0) && (this.spikeHit = 0);
        let newLocation = new Vec2(
            this.location.x,
            this.location.y
        );
        
        let packetFactory = PacketFactory.getInstance();

        // for (let player_to_log of game.state.players){

        //     player_to_log.client?.socket.send(
        //         packetFactory.serializePacket(
        //           new Packet(
        //             PacketType.CHAT,
        //             [this.id, deltaTime.toFixed(4).toString()]
        //           )
        //         )
        //       );
        // }

        newLocation.add(deltaTime * this.velocity.x, deltaTime * this.velocity.y);

        //deceleration
        let decel_coeff = game.playerDecel ** deltaTime;
        this.velocity.multiply(decel_coeff, decel_coeff); //testing with constants
        
        let gameObj;
        for (gameObj of this.getNearbyGameObjects(game.state, true)){
            newLocation = this.checkCollision(gameObj, newLocation);
        }

        newLocation.clamp(new Vec2(35, 35), new Vec2(game.mapScale - 35, game.mapScale - 35));
        this.location = newLocation

        
    };


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