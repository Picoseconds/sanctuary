import weapons from './weapons.json';
import items from './items.json';
import { ItemType } from './UpgradeItems';
import { WeaponVariant } from '../moomoo/Weapons';

enum PrimaryWeapons {
  ToolHammer = 0,
  Axe = 1,
  Sword = 3,
  Polearm = 5,
  Bat = 6,
  Daggers = 7,
  Stick = 8,
  Katana = 4,
  GreatAxe = 2
}

enum SecondaryWeapons {
  GreatHammer = 10,
  Shield,
  Crossbow = 12,
  RepeaterCrossbow = 13,
  McGrabby = 14,
  Musket = 15,
  Bow = 9
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

    case Weapons.GreatAxe:
      return 400;

    case Weapons.Katana:
      return 300;
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

function getWeaponGatherAmount(item: Weapons) {
  let weapon = weapons.find(weapon => weapon.id == item);
  return weapon?.gather || 0;
}

function getItemCost(item: ItemType) {
  return items[item].req;
}

function getPlaceable(item: ItemType) {
  return !!items[item].group.place;
}

function getGroupID(item: ItemType) {
  return items[item].group.id;
}

function getPrerequisiteItem(item: ItemType) {
  return items[item].pre;
}

function getPrerequisiteWeapon(weapon: Weapons) {
  return weapons[weapon].pre;
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

export { PrimaryWeapons, SecondaryWeapons, getHitTime, Weapons, getWeaponAttackDetails, getWeaponDamage, getItemCost, getPlaceable, getPlaceOffset, getScale, getGameObjID, getWeaponGatherAmount, getPrerequisiteItem, getGroupID, getPrerequisiteWeapon };