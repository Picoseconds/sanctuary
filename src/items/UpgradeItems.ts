/* enum StartingItems {
  Axe = 1,
  Sword = 3,
  Polearm = 5,
  Bat = 6,
  Daggers = 7,
  Stick = 8
} */

enum StartingItems {
  Apple = 0,
  WoodWall = 3,
  Spikes = 6,
  Windmill = 10
}

enum Age3Items {
  Cookie = 1,
  StoneWall = 20
}

enum Age4Items {
  PitTrap = 15,
  BoostPad = 32
}

enum Age5Items {
  GreaterSpikes = 7,
  FasterWindmill = 27,
  Mine = 29,
  Sapling = 30
}

enum Age6Items {
  Bow = 9,
  GreatHammer = 10,
  Shield = 11,
  McGrabby = 12
}

enum Age7Items {
  Cheese = 2,
  Turret = 33,
  Platform = 34,
  HealingPad = 35,
  Blocker = 37,
  Teleporter = 38,
  CastleWall = 21
}

enum Age8Items {
  Katana = 4,
  GreatAxe = 2,
  Crossbow = 12,
  PowerMill = 28
}

enum Age9Items {
  PoisonSpikes = 24,
  SpinningSpikes = 25,
  SpawnPad = 36
}

const ItemType = {
  ...StartingItems,
  ...Age3Items,
  ...Age4Items,
  ...Age5Items,
  ...Age6Items,
  ...Age7Items,
  ...Age8Items,
  ...Age9Items
};

type ItemType = StartingItems | Age3Items | Age4Items | Age5Items | Age6Items | Age7Items | Age8Items | Age9Items;

export { Age3Items, Age4Items, Age5Items, Age6Items, Age7Items, Age8Items, Age9Items, ItemType }