import Vec2 from "vec2";
import { GameObjectType } from './gameobjects';

export default class GameObject {
  constructor(
    public id: number = 0,
    public location: Vec2 = new Vec2(0, 0),
    public angle: number = 0,
    public scale: number = 1,
    public type: GameObjectType = GameObjectType.Tree,
    public realScale: number = scale,
    public data: any = null,
    public ownerSID: number = -1
  ) {}

  getData() {
    return [
			this.id,
			this.location.x,
			this.location.y,
			this.angle,
			this.scale,
			this.type,
			this.data,
			this.ownerSID
		];
  }
}