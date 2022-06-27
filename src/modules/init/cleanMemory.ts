export default function cleanMemory() {
    for (const name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
        }
    }
    for (const name in Memory.marks) {
        if (JSON.stringify(Memory.marks[name]) == "{}" || Game.getObjectById(name as Id<_HasId>) == null) {
            delete Memory.marks[name];
        }
    }
    delete Memory.transferMaximum;
}
