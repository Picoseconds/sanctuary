import weapons from '../items/weapons.json';
import items from '../items/items.json';

function getUpgrades(age: number): number[] {
  return items.map((_item, index) => index).filter(item => items[item].age == age);
}

function getWeaponUpgrades(age: number) {
  return weapons.map((_item, index) => index).filter(item => weapons[item].age === age);
}

export { getUpgrades, getWeaponUpgrades };