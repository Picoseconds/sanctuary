import Vec2 from "vec2";
import entities from './entities.json';

for (let i=0; i<entities.length;i++) {
    console.log(JSON.stringify(entities[i]));
    
}

export default class Entity {
    public id: number;
    public location: Vec2;
    public angle: number;
    public velocity: Vec2;
    public scale = 50;

    constructor(id: number, location: Vec2, angle: number = 0, velocity: Vec2 = new Vec2(0, 0)) {
        this.id = id;
        this.location = location;
        this.angle = angle;
        this.velocity = velocity;
    }
}