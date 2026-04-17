import requestEnergy from "../../transfer/requestEnergy";
import type { CreepRoleConfig } from "./creepRoleConfig";

const repairerConfig: CreepRoleConfig = {
  name: "Repairer",
  limitAmount: (roomName: string) => {
    const room = Game.rooms[roomName];
    if (!room) return 0;
    const damaged = room.find(FIND_STRUCTURES, {
      filter: (s) => s.hits < s.hitsMax && s.structureType != STRUCTURE_WALL,
    });
    return Math.min(2, Math.ceil(damaged.length / 5));
  },
  extraMemory: (spawn) => {
    return {
      repairerDetail: {
        targetStructureId: null,
      },
    };
  },
  work: (creep) => {
    // 能量不足时预约补给，但不中断工作
    if (creep.store.getUsedCapacity() === 0) {
      if (creep.memory.repairerDetail.targetStructureId == null) creep.moveTo(Game.flags["Flag1"]);
      creep.say("🔧等能量");
      requestEnergy(creep);
      return;
    }
    requestEnergy(creep);

    const repairTarget = Game.getObjectById(creep.memory.repairerDetail.targetStructureId);
    if (!repairTarget || repairTarget.hits == repairTarget.hitsMax) {
      // 不知道要修啥或者修好了，选择一个可修的去修
      const targets = creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_CONTAINER ||
              structure.structureType == STRUCTURE_ROAD ||
              structure.structureType == STRUCTURE_RAMPART ||
              structure.structureType == STRUCTURE_WALL ||
              structure.structureType == STRUCTURE_LINK ||
              structure.structureType == STRUCTURE_STORAGE ||
              structure.structureType == STRUCTURE_TOWER ||
              structure.structureType == STRUCTURE_OBSERVER ||
              structure.structureType == STRUCTURE_POWER_BANK ||
              structure.structureType == STRUCTURE_POWER_SPAWN) &&
            structure.hits < structure.hitsMax
          );
        },
      });
      if (targets.length) {
        let minHitsRatio = 1;
        targets.forEach((target) => {
          if (target.hits / target.hitsMax < minHitsRatio) {
            creep.memory.repairerDetail.targetStructureId = target.id;
            minHitsRatio = target.hits / target.hitsMax;
          }
        });
      } else {
        creep.say("🔧空闲中");
        creep.memory.repairerDetail.targetStructureId = null;
      }
      return;
    }

    // 知道要修什么，去修
    if (creep.repair(repairTarget) == ERR_NOT_IN_RANGE) {
      creep.say("🔧移动中");
      creep.moveTo(repairTarget, {
        visualizePathStyle: { stroke: "#ffffff" },
      });
      return;
    }

    creep.say("🔧维修中");

    // 如果修好了的话，换目标
    if (repairTarget.hits == repairTarget.hitsMax) {
      creep.say("🔧换目标");
      creep.memory.repairerDetail.targetStructureId = null;
    }
  },
  body: {
    template: [WORK, CARRY, MOVE],
    maxRepeat: 5,
    minTemplate: [WORK, CARRY, MOVE],
  },
  priority: (roomName) => {
    const room = Game.rooms[roomName];
    if (!room) return 0;
    const damaged = room.find(FIND_STRUCTURES, {
      filter: (s) => s.hits < s.hitsMax && s.structureType != STRUCTURE_WALL,
    });
    if (damaged.length == 0) return 0;
    return 1;
  },
};

export default repairerConfig;
