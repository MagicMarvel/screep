export const roleHarvester = {
  /** @param {Creep} creep **/
  run: function (creep: Creep) {
    // 返回当前还能存多少东西
    if (creep.store.getFreeCapacity() > 0) {
      var sources = creep.room.find(FIND_SOURCES);
      // 当资源点不在范围内的时候，移动过去
      if (creep.harvest(sources[0]) == ERR_NOT_IN_RANGE) {
        creep.moveTo(sources[0], { visualizePathStyle: { stroke: "#ffaa00" } });
      }
    } else {
      // 当前能量满了的话，找一个extension或者spawn（要求能量没满）
      var targets = creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            // 找到能量存储结构
            (structure.structureType == STRUCTURE_EXTENSION ||
              structure.structureType == STRUCTURE_SPAWN) &&
            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
          );
        },
      });
      // 如果这样的能量没满的store有多个
      if (targets.length > 0) {
        // 直接将能量传递给第一个store
        if (creep.transfer(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(targets[0], {
            visualizePathStyle: { stroke: "#ffffff" },
          });
        }
      }
    }
  },
};
