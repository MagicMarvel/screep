import requestEnergy from "../../transfer/requestEnergy";
import type { CreepRoleConfig } from "./creepRoleConfig";

const BAD_TARGET_COOLDOWN = 100;

const builderConfig: CreepRoleConfig = {
  name: "Builder",
  limitAmount: (roomName: string) => {
    const room = Game.rooms[roomName];
    if (!room) return 0;
    const sites = room.find(FIND_CONSTRUCTION_SITES);
    return Math.min(4, Math.ceil(sites.length / 2));
  },
  extraMemory: (spawn) => {
    return {
      builderDetail: {
        targetSiteId: null,
      },
    };
  },
  work: (creep) => {
    // 能量不足时预约补给，但不中断工作
    if (creep.store.getUsedCapacity() === 0) {
      if (creep.memory.builderDetail.targetSiteId == null) creep.moveTo(Game.flags["Flag1"]);
      creep.say("🔨等能量");
      requestEnergy(creep);
      return;
    }
    requestEnergy(creep);

    // 没有建造目标，选择一个
    if (creep.memory.builderDetail.targetSiteId == null || Game.getObjectById(creep.memory.builderDetail.targetSiteId) == null) {
      const targets = creep.room.find(FIND_CONSTRUCTION_SITES).filter(
        (site) => !Memory.badBuildTargets?.[site.id] || Memory.badBuildTargets[site.id] < Game.time
      );
      if (targets.length) {
        creep.memory.builderDetail.targetSiteId = targets[0].id;
      } else {
        creep.say("🔨空闲中");
      }
      return;
    }

    // 去建造
    const buildingTarget = Game.getObjectById(creep.memory.builderDetail.targetSiteId);
    if (!buildingTarget || !(buildingTarget instanceof ConstructionSite)) {
      creep.memory.builderDetail.targetSiteId = null;
      return;
    }

    // 建造目标已完成或不在同一房间
    if (buildingTarget.progress === buildingTarget.progressTotal || buildingTarget.room?.name !== creep.room.name) {
      creep.say("🔨完成");
      creep.memory.builderDetail.targetSiteId = null;
      return;
    }

    const result = creep.build(buildingTarget);
    if (result == ERR_NOT_IN_RANGE) {
      creep.say("🔨移动中");
      creep.moveTo(buildingTarget, {
        visualizePathStyle: { stroke: "#ffffff" },
      });
    } else if (result == OK) {
      creep.say("🔨建造中");
    } else {
      // 建造失败，记录坏目标，下次选目标时跳过
      if (!Memory.badBuildTargets) Memory.badBuildTargets = {};
      Memory.badBuildTargets[buildingTarget.id] = Game.time + BAD_TARGET_COOLDOWN;
      creep.memory.builderDetail.targetSiteId = null;
    }
  },
  body: {
    template: [WORK, WORK, CARRY, MOVE],
    maxRepeat: 5,
    minTemplate: [WORK, CARRY, MOVE],
  },
  priority: (roomName) => {
    const room = Game.rooms[roomName];
    if (!room || room.controller?.level == 1) return 0;
    const sites = room.find(FIND_CONSTRUCTION_SITES);
    if (sites.length == 0) return 0;
    return 2;
  },
};

export default builderConfig;
