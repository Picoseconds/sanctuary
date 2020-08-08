import acc from "../acc.json"

function getAcc(id: number) {
    return acc.find(acc => acc.id == id);
}

export { getAcc };
