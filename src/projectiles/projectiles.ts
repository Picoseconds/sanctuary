import projectiles from "./projectiles.json";
import e from "express";

enum Layer {
    Pad = -1,
    Player = 0,
    Platform = 1
}

enum ProjectileType {
    Bow = 0,
    Turret = 1,
    Crossbow = 2,
    RepeaterCrossbow = 3,
    Musket = 5
}

function getProjectileDamage(type: ProjectileType) {
    return projectiles[type].dmg;
}

function getProjectileLayer(type: ProjectileType) {
    return projectiles[type].layer;
}

function getProjectileRange(type: ProjectileType) {
    return projectiles[type].range;
}

function getProjectileSpeed(type: ProjectileType) {
    return projectiles[type].speed;
}

export { getProjectileDamage, getProjectileLayer, getProjectileRange, getProjectileSpeed, ProjectileType, Layer };