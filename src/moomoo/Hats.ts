import hats from "../hats.json";

interface Hat {
    /**
     * The id of this hat
     */
    id: number;

    /**
     * The multiplier of damage when this hat is worn
     */
    dmgMult: number;
    dmgMultO: number;

    /**
     * The multiplier of speed when this hat is worn
     */
    spdMult: number;

    /**
     * Whether or not it should be impossible to eat while wearing this hat
     */
    noEat: boolean;

    /**
     * How much to knock an enemy back when attacked while wearing this hat
     */
    dmgK: number;

    /**
     * Whether or not to be ignored by turret AI while wearing this hat
     */
    antiTurret: boolean;
}