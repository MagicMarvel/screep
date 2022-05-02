import getEnergyFromStructure from "../../moveTools/getEnergyFromStructure";
/** @param {Creep} creep **/
export default function (creep: Creep) {
  // 如果这个creep没有能量的话，就去收集能量
  if (
    creep.memory.upgradeDetail.upgrading &&
    creep.store[RESOURCE_ENERGY] == 0
  ) {
    creep.memory.upgradeDetail.upgrading = false;
    creep.say("🔄 harvest");
  }
  if (
    !creep.memory.upgradeDetail.upgrading &&
    creep.store.getFreeCapacity() == 0
  ) {
    creep.memory.upgradeDetail.upgrading = true;
    creep.say("🚧 upgrade");
  }
  if (!creep.memory.upgradeDetail.upgrading) {
    getEnergyFromStructure(creep);
  } else {
    if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
      creep.moveTo(creep.room.controller);
    }
  }
}
