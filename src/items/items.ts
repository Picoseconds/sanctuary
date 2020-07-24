import weapons from './weapons.json';

/**
 * An enum containing the names of all the items. Saves you the effort of differentiating weapon items and other items
 */
enum PrimaryWeapons {
  ToolHammer = 0,
  Axe = 1,
  Sword = 3,
  Polearm = 5,
  Bat = 6,
  Daggers = 7,
  Stick = 8
}

enum SecondaryWeapons {
  GreatHammer = 9,
  Shield,
  Crossbow,
  RepeaterCrossbow,
  McGrabby,
  Musket,
  Bow
}

interface AttackDetails {
  kbMultiplier: number;
  attackRange: number;
}

const Weapons = {
  ...PrimaryWeapons,
  ...SecondaryWeapons,
}

type Weapons = PrimaryWeapons | SecondaryWeapons

function getHitTime(weapon: Weapons) {
  switch (weapon) {
    case Weapons.ToolHammer:
      return 450;

    case Weapons.Axe:
      return 560;

    case Weapons.Bat:
      return 450;

    case Weapons.Bow:
      return 785;

    case Weapons.Crossbow:
      return 900;

    case Weapons.Daggers:
      return 225;

    case Weapons.GreatHammer:
      return 560;

    case Weapons.McGrabby:
      return 900;

    case Weapons.Musket:
      return 1685;

    case Weapons.Polearm:
      return 900;

    case Weapons.RepeaterCrossbow:
      return 450;

    case Weapons.Shield:
      throw 'Shield does not have a hit time!';

    case Weapons.Stick:
      return 560;

    case Weapons.Sword:
      return 450;
  }
}

function getWeaponAttackDetails(item: Weapons): AttackDetails {
  let weapon = weapons.find(weapon => weapon.id == item);
  return { kbMultiplier: weapon?.knock || 1, attackRange: weapon?.range || 10 };
}

function getWeaponDamage(item: Weapons) {
  let weapon = weapons.find(weapon => weapon.id == item);
  return weapon?.dmg || 0;
}

function getWeaponId(item: Weapons): number {
  switch (item) {
    case Weapons.Axe:
      return 1;

    // case Items.Bat:
    //  return 
  }

  return 0;
}

export { StartingItems, StartingItems as Age2Items } from "./StartingItems";
export { PrimaryWeapons, SecondaryWeapons, getHitTime, Weapons, getWeaponAttackDetails, getWeaponDamage };