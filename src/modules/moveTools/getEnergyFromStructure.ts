/**
 * @param {Creep} creep 需要获得能量的creep
 */
export default (creep: Creep) => {
  let sources = creep.room.find(FIND_STRUCTURES, {
    filter: (structure) => {
      return (
        (structure.structureType == STRUCTURE_CONTAINER ||
          structure.structureType == STRUCTURE_EXTENSION ||
          structure.structureType == STRUCTURE_SPAWN) &&
        structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0
      );
    },
  });

  const containers = sources.filter((source) => {
    return source.structureType == STRUCTURE_CONTAINER;
  });

  let maxDistance = 9999999;
  let target: AnyStructure;

  if (containers.length > 0) {
    containers.forEach((container) => {
      const x = creep.pos.x - container.pos.x;
      const y = creep.pos.y - container.pos.y;
      const distance = Math.sqrt(x * x + y * y);
      if (distance < maxDistance) {
        maxDistance = distance;
        target = container;
      }
    });

    if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
      creep.moveTo(target, {
        visualizePathStyle: { stroke: "#ffffff" },
      });
    }
  } else {
    if (creep.withdraw(sources[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
      creep.moveTo(sources[0], {
        visualizePathStyle: { stroke: "#ffffff" },
      });
    }
  }
};
