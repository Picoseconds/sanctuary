enum GameObjectType {
  Tree = 0,
  StoneMine,
  GoldMine = 3,
  Spike,
  GreaterSpike,
  PoisonSpike,
  SpinningSpike,
  WoodWall,
  StoneWall,
  CastleWall,
  Sapling,
  Mine = 2,
  Bush = 1,
  Cactus
}

let gameObjectSizes: Partial<Record<GameObjectType, number[]>> = { };
gameObjectSizes[GameObjectType.Tree] = [150, 160, 165, 175];
gameObjectSizes[GameObjectType.Bush] = gameObjectSizes[GameObjectType.Mine] = [80, 85, 90];
gameObjectSizes[GameObjectType.GoldMine] = [80];

gameObjectSizes = Object.freeze(gameObjectSizes);

export { gameObjectSizes, GameObjectType };