import { sortBy } from "lodash";
import getEnergyFromStructure from "../../moveTools/getEnergyFromStructure";
/** @param {Creep} creep **/
export default (creep: Creep) => {
  if (
    creep.memory.repairerDetail.repairing &&
    creep.store[RESOURCE_ENERGY] == 0
  ) {
    creep.memory.repairerDetail.repairing = false;
    creep.say("🔄 adding energy");
  }

  // 拿完能量了后，就去修理
  if (
    !creep.memory.repairerDetail.repairing &&
    creep.store.getFreeCapacity() == 0
  ) {
    creep.memory.repairerDetail.repairing = true;
    creep.say("🚧 repairing");
  }

  if (creep.memory.repairerDetail.repairing) {
    var targets = creep.room.find(FIND_STRUCTURES, {
      filter: (structure) => {
        return (
          (structure.structureType == STRUCTURE_ROAD ||
            structure.structureType == STRUCTURE_CONTAINER ||
            structure.structureType == STRUCTURE_RAMPART ||
            structure.structureType == STRUCTURE_WALL) &&
          structure.hits < structure.hitsMax
        );
      },
    });

    targets = sortBy(targets, (t) => t.hits);
    if (targets.length) {
      const building = targets[0];
      if (creep.repair(building) == ERR_NOT_IN_RANGE) {
        creep.moveTo(building, {
          visualizePathStyle: { stroke: "#ffffff" },
        });
      }
    }
  } else {
    // 拿能量
    getEnergyFromStructure(creep);
  }
};
