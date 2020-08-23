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
  StoneWall = 4
}

enum Age4Items {
  PitTrap = 15,
  BoostPad = 16
}

enum Age5Items {
  GreaterSpikes = 7,
  FasterWindmill = 11,
  Mine = 13,
  Sapling = 14
}

enum Age7Items {
  Cheese = 2,
  Turret = 17,
  Platform = 18,
  HealingPad = 19,
  Blocker = 21,
  Teleporter = 22,
  CastleWall = 5
}

enum Age8Items {
  PowerMill = 12
}

enum Age9Items {
  PoisonSpikes = 8,
  SpinningSpikes = 9,
  SpawnPad = 20
}

const ItemType = {
  ...StartingItems,
  ...Age3Items,
  ...Age4Items,
  ...Age5Items,
  ...Age7Items,
  ...Age8Items,
  ...Age9Items
};

type ItemType = StartingItems | Age3Items | Age4Items | Age5Items | Age7Items | Age8Items | Age9Items;

export { Age3Items, Age4Items, Age5Items, Age7Items, Age8Items, Age9Items, ItemType }