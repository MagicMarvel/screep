import { sortBy, sortByOrder } from "lodash";
import getEnergyFromStructure from "../../moveTools/getEnergyFromStructure";
/** @param {Creep} creep **/
export default (creep: Creep) => {
  // if (creep.store.getFreeCapacity() > 0) {
  //   // 还能装东西的话
  //   for (const name of creep.room.find(FIND_TOMBSTONES)) {
  //     const source = Game.getObjectById(name.id);
  //     if (source.store[RESOURCE_ENERGY] > 0) {
  //       if (creep.withdraw(source, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
  //         creep.moveTo(source, {
  //           visualizePathStyle: { stroke: "#ffffff" },
  //         });
  //       }
  //       return;
  //     }
  //   }

  //   // 捡起掉落物品
  //   const resources = creep.room.find(FIND_DROPPED_RESOURCES);
  //   const source =
  //     resources[parseInt(creep.name.slice(11, -1)) % resources.length];

  //   if (creep.pickup(source) == ERR_NOT_IN_RANGE) {
  //     creep.moveTo(source, {
  //       visualizePathStyle: { stroke: "#ffffff" },
  //     });
  //   }
  //   return;
  // } else {
  //   // 不能装东西就找一个地方放进去
  //   const targets = creep.room.find(FIND_STRUCTURES, {
  //     filter: (structure) => {
  //       return (
  //         (structure.structureType == STRUCTURE_CONTAINER ||
  //           structure.structureType == STRUCTURE_EXTENSION ||
  //           structure.structureType == STRUCTURE_SPAWN) &&
  //         structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
  //       );
  //     },
  //   });

  //   if (targets.length > 0) {
  //     let target = targets[0];
  //     for (let i = 0; i < targets.length; i++) {
  //       const element = targets[i];
  //       if (element.structureType != STRUCTURE_CONTAINER) {
  //         target = element;
  //         break;
  //       }
  //     }
  //     if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE)
  //       creep.moveTo(target);
  //   } else {
  //     creep.moveTo(Game.flags.Transferer);
  //   }
  // }

  if (creep.store.getFreeCapacity() > 0) {
    let containers = creep.room.find(FIND_STRUCTURES, {
      filter: (structure) => {
        return (
          structure.structureType == STRUCTURE_CONTAINER &&
          structure.store[RESOURCE_ENERGY] > 0
        );
      },
    }) as StructureContainer[];

    containers = sortByOrder(
      containers,
      (s) => s.store[RESOURCE_ENERGY],
      "desc"
    );

    if (containers.length > 0) {
      if (creep.withdraw(containers[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        creep.moveTo(containers[0], {
          visualizePathStyle: { stroke: "#ffffff" },
        });
      }
      return;
    }
  } else {
    const extension = creep.room.find(FIND_STRUCTURES, {
      filter: (structure) => {
        return (
          structure.structureType == STRUCTURE_EXTENSION &&
          structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        );
      },
    });
    if (extension.length > 0) {
      if (creep.transfer(extension[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        creep.moveTo(extension[0], {
          visualizePathStyle: { stroke: "#ffffff" },
        });
      }
      return;
    } else {
      const spawn = creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            structure.structureType == STRUCTURE_SPAWN &&
            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
          );
        },
      });
      if (spawn.length > 0) {
        if (creep.transfer(spawn[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(spawn[0], {
            visualizePathStyle: { stroke: "#ffffff" },
          });
        }
        return;
      }
    }
  }
};
