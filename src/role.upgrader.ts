export const roleUpgrader = {
  /** @param {Creep} creep **/
  run: function (creep: Creep) {
    // 如果这个creep没有能量的话，就去收集能量
    if (creep.store[RESOURCE_ENERGY] == 0) {
      var sources = creep.room.find(FIND_SOURCES);
      if (creep.harvest(sources[0]) == ERR_NOT_IN_RANGE) {
        creep.moveTo(sources[0]);
      }
    } else {
      if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
        creep.moveTo(creep.room.controller);
      }
    }
  },
};
