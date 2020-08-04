import hats from "../hats.json"

function getHat(id: number) {
    return hats.find(hat => hat.id == id);
}

export { getHat };