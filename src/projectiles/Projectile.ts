import Vec2 from "vec2";
import Entity from "../moomoo/Entity";
import { ProjectileType, Layer, getProjectileDamage } from "./projectiles";

class Projectile extends Entity {
    public distance: number = 0;

    constructor(
        public id: number,
        public location: Vec2,
        public type: ProjectileType,
        public speed: number,
        public angle: number,
        public layer: Layer,
        public ownerSID: number,
        public damage: number = getProjectileDamage(type)
    ) {
        super(id, location, angle, new Vec2(speed * Math.cos(angle), speed * Math.sin(angle)));
    }
}

export default Projectile;