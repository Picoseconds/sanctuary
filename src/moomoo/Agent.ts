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
        
    }

    getUpdateData(){
        return [this.id, this.agent_dat.id || 0, this.location.x, this.location.y, this.angle, this.health, this.cowNameIndex]
    }
    
    update(deltaTime:Number) {
        //TODO add damage over time

        if (!this.zIndex 
            && !this.lockMove //if can move
            && this.y >= this.game.mapScale / 2 - this.game.riverWidth / 2 //below top river line
            && this.y <= this.game.mapScale / 2 + this.game.riverWidth / 2 //over bottom river line
            && (speedMultiplier = .33, this.velocity.x += this.game.waterCurrent * deltaTime) //then set speed slower and accelerate right
            , this.lockMove){ //then if you cannot move (see comma operator js)

                this.velocity.x = 0, this.velocity.y = 0 //set speed to 0

        }else if (this.waitCount > 0) {
            //ai state of waiting
            if (this.waitCount -= deltaTime, this.waitCount <= 0)
                if (this.agent_dat.chargePlayer) {
                    //attackplayer
                    var h, u, d;
                    for (let f = 0; f < n.length; ++f){
                        !n[f].alive || n[f].skin && n[f].skin.bullRepel || (d = o.getDistance(this.x, this.y, n[f].x, n[f].y)) <= this.viewRange && (!h || d < u) && (u = d, h = n[f]);
                    } 
                    h ? (this.chargeTarget = h, this.moveCount = o.randInt(8e3, 12e3)) : (this.moveCount = o.randInt(1e3, 2e3), this.targetDir = o.randFloat(-Math.PI, Math.PI))
                } else this.moveCount = o.randInt(4e3, 1e4), this.targetDir = o.randFloat(-Math.PI, Math.PI)
        } else if (this.moveCount > 0) {
            //ai state of moving
            var p = this.speed * speedMultiplier;
            if (this.runFrom && this.runFrom.active && (!this.runFrom.isPlayer || this.runFrom.alive) ? (this.targetDir = o.getDirection(this.x, this.y, this.runFrom.x, this.runFrom.y), p *= 1.42) : this.chargeTarget && this.chargeTarget.alive && (this.targetDir = o.getDirection(this.chargeTarget.x, this.chargeTarget.y, this.x, this.y), p *= 1.75, s = !0), this.hitWait && (p *= .3), this.dir != this.targetDir) {
                this.dir %= i; //mod 2pi
                var rawdelta = (this.dir - this.targetDir + i) % i, //mod 2pi (get some sort of delta to target)
                    m = Math.min(Math.abs(rawdelta - i), rawdelta, this.turnSpeed * deltaTime), //then calculate the minimum distance to turn (maximum then being turnspeed)
                    y = rawdelta - Math.PI >= 0 ? 1 : -1; //finally get a multiplier for the direction to turn
                this.dir += y * m + i //change the direction (no idea why add 2pi???)
            }
            this.dir %= i; //make sure it's clamped between 0 and 2pi
            this.xVel += p * deltaTime * Math.cos(this.dir);
            this.yVel += p * deltaTime * Math.sin(this.dir);
            this.moveCount -= deltaTime; //remove moving time
            //wait if your moving time has ended
            this.moveCount <= 0 && (this.runFrom = null, this.chargeTarget = null, this.waitCount = this.hostile ? 1500 : o.randInt(1500, 6e3)) 
        }
        
        if (this.active) {
            if (this.spawnCounter) return this.spawnCounter -= deltaTime, void(this.spawnCounter <= 0 && this.respawn());
            (l -= deltaTime) <= 0 && (this.dmgOverTime.dmg && (this.changeHealth(-this.dmgOverTime.dmg, this.dmgOverTime.doer), this.dmgOverTime.time -= 1, this.dmgOverTime.time <= 0 && (this.dmgOverTime.dmg = 0)), l = 1e3);
            var s = false;
            var speedMultiplier = 1;

            this.zIndex = 0, this.lockMove = false;
            
            //cut the movement into up to 4 pieces??
            var k = o.getDistance(0, 0, this.xVel * deltaTime, this.yVel * deltaTime), //TODO replace this with a sqrt
                w = Math.min(4, Math.max(1, Math.round(k / 40))),
                v = 1 / w;
            
            //check collisions (i think this is handled for me...)
            for (f = 0; f < w; ++f) {
                this.xVel && (this.x += this.xVel * deltaTime * v), this.yVel && (this.y += this.yVel * deltaTime * v), grid = t.getGridArrays(this.x, this.y, this.scale);
                for (var b = 0; b < grid.length; ++b)
                    for (var x = 0; x < grid[b].length; ++x) grid[b][x].active && t.checkCollision(this, grid[b][x], v)
            }


            var S, I, T;
            var M = false;
            if (this.hitWait > 0 && (this.hitWait -= deltaTime, this.hitWait <= 0)) {
                M = true;
                this.hitWait = 0;

                (this.leapForce) //if we have an amount to leap by
                && !o.randInt(0, 2) // 1/3 of the time
                && (this.xVel += this.leapForce * Math.cos(this.dir), this.yVel += this.leapForce * Math.sin(this.dir)); //jump forward

                ` var p, g, m = [];
                this.getGridArrays = function(e, t, n) {
                    u = Math.floor(e / f), d = Math.floor(t / f), m.length = 0;
                    try {
                        this.grids[u + "_" + d] && m.push(this.grids[u + "_" + d]), e + n >= (u + 1) * f && ((p = this.grids[u + 1 + "_" + d]) && m.push(p), d && t - n <= d * f ? (p = this.grids[u + 1 + "_" + (d - 1)]) && m.push(p) : t + n >= (d + 1) * f && (p = this.grids[u + 1 + "_" + (d + 1)]) && m.push(p)), u && e - n <= u * f && ((p = this.grids[u - 1 + "_" + d]) && m.push(p), d && t - n <= d * f ? (p = this.grids[u - 1 + "_" + (d - 1)]) && m.push(p) : t + n >= (d + 1) * f && (p = this.grids[u - 1 + "_" + (d + 1)]) && m.push(p)), t + n >= (d + 1) * f && (p = this.grids[u + "_" + (d + 1)]) && m.push(p), d && t - n <= d * f && (p = this.grids[u + "_" + (d - 1)]) && m.push(p)
                    } catch (e) {}
                    return m
                }`

                var grid = t.getGridArrays(this.x, this.y, this.hitRange); //no idea what this returns
                
                for (let P = 0; P < grid.length; ++P)
                    for (b = 0; b < grid[P].length; ++b)(S = grid[P][b]).health && (I = o.getDistance(this.x, this.y, S.x, S.y)) < S.scale + this.hitRange && (S.changeHealth(5 * -this.dmg) && t.disableObj(S), t.hitObj(S, o.getDirection(this.x, this.y, S.x, S.y)));
                for (b = 0; b < n.length; ++b) n[b].canSee(this) && c.send(n[b].id, "aa", this.sid)
            }
            if (s || M)
                for (f = 0; f < n.length; ++f)(S = n[f]) && S.alive && (I = o.getDistance(this.x, this.y, S.x, S.y), this.hitRange ? !this.hitWait && I <= this.hitRange + S.scale && (M ? (T = o.getDirection(S.x, S.y, this.x, this.y), S.changeHealth(-this.dmg), S.xVel += .6 * Math.cos(T), S.yVel += .6 * Math.sin(T), this.runFrom = null, this.chargeTarget = null, this.waitCount = 3e3, this.hitWait = o.randInt(0, 2) ? 0 : 600) : this.hitWait = this.hitDelay) : I <= this.scale + S.scale && (T = o.getDirection(S.x, S.y, this.x, this.y), S.changeHealth(-this.dmg), S.xVel += .55 * Math.cos(T), S.yVel += .55 * Math.sin(T)));
            //deceleration
            this.xVel && (this.xVel *= Math.pow(this.game.playerDecel, deltaTime)), this.yVel && (this.yVel *= Math.pow(this.game.playerDecel, deltaTime));
            var E = this.scale;
            this.x - E < 0 ? (this.x = E, this.xVel = 0) : this.x + E > this.game.mapScale && (this.x = this.game.mapScale - E, this.xVel = 0), this.y - E < 0 ? (this.y = E, this.yVel = 0) : this.y + E > this.game.mapScale && (this.y = this.game.mapScale - E, this.yVel = 0)
        }
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