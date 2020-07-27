import { ItemType } from './UpgradeItems';

enum Resources {
    Food,
    Wood,
    Stone,
    Points
}

export default class Item {
    constructor(
        public type: ItemType,
        public requires?: [Resources, number]
    ) { }
}