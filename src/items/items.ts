import weapons from './weapons.json';
import items from './items.json';
import { ItemType } from './UpgradeItems';
import { WeaponVariant } from '../moomoo/Weapons';

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

function getWeaponDamage(item: Weapons, weaponVariant: WeaponVariant) {
  let weapon = weapons.find(weapon => weapon.id == item);
  let baseDamage = weapon?.dmg || 0;

  switch (weaponVariant) {
    case WeaponVariant.Normal:
      return baseDamage;
    case WeaponVariant.Gold:
      return baseDamage * 1.1;
    case WeaponVariant.Diamond:
    case WeaponVariant.Ruby:
      return baseDamage * 1.18;
  }
}

function getItemCost(item: ItemType) {
  return items[item].req;
}

function getPlaceable(item: ItemType) {
  return !!items[item].group.place;
}

function getPlaceOffset(item: ItemType) {
  return items[item].placeOffset;
}

function getScale(item: ItemType) {
  return items[item].scale;
}

function getGameObjID(item: ItemType) {
  switch (item) {
    case ItemType.WoodWall:
      return 3;
  }

  return 0;
}

export { PrimaryWeapons, SecondaryWeapons, getHitTime, Weapons, getWeaponAttackDetails, getWeaponDamage, getItemCost, getPlaceable, getPlaceOffset, getScale, getGameObjID };