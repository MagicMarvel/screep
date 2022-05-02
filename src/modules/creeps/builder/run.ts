import getEnergyFromStructure from "../../moveTools/getEnergyFromStructure";
/** @param {Creep} creep **/
export default (creep: Creep) => {
  if (
    creep.memory.builderDetail.building &&
    creep.store[RESOURCE_ENERGY] == 0
  ) {
    creep.memory.builderDetail.building = false;
    creep.say("🔄 harvest");
  }
  if (
    !creep.memory.builderDetail.building &&
    creep.store.getFreeCapacity() == 0
  ) {
    creep.memory.builderDetail.building = true;
    creep.say("🚧 build");
  }

  if (creep.memory.builderDetail.building) {
    var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
    if (targets.length) {
      if (
        creep.build(targets[parseInt(creep.name.slice(8, 10)) % 2]) ==
        ERR_NOT_IN_RANGE
      ) {
        creep.moveTo(targets[parseInt(creep.name.slice(8, 10)) % 2], {
          visualizePathStyle: { stroke: "#ffffff" },
        });
      }
    }
  } else {
    getEnergyFromStructure(creep);
  }
};
