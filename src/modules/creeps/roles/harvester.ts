import { CreepRole } from "../creepRole";
import { isSourceTooCrowded } from "../../utils/isSourceTooCrowded";
import type { CreepRoleConfig } from "./creepRoleConfig";

const harvesterConfig: CreepRoleConfig = {
  name: "Harvester",
  limitAmount: (roomName: string) => {
    const room = Game.rooms[roomName];
    if (!room) return 2;
    return room.find(FIND_SOURCES).length * 2;
  },
  extraMemory: (spawn: StructureSpawn) => {
    const sources = spawn.room.find(FIND_SOURCES);
    const harvestersPerSource: { [sourceId: Id<Source>]: number } = {};

    // 只遍历同房间的harvester，而非所有creep
    for (const name in Game.creeps) {
      const creep = Game.creeps[name];
      if (creep.room.name != spawn.room.name) continue;
      if (creep.memory.role == CreepRole.HARVESTER) {
        const sourceId = creep.memory.harvesterDetail.targetSourceId;
        harvestersPerSource[sourceId] = (harvestersPerSource[sourceId] || 0) + 1;
      }
    }

    // 优先分配给没有harvester的source
    for (const source of sources) {
      if (!harvestersPerSource[source.id]) {
        return { harvesterDetail: { targetSourceId: source.id } };
      }
    }

    // 然后分配给harvester未满2个的source
    for (const sourceId in harvestersPerSource) {
      if (harvestersPerSource[sourceId] < 2) {
        return {
          harvesterDetail: {
            targetSourceId: sourceId as Id<Source>,
          },
        };
      }
    }
  },
  work: function run(creep: Creep) {
    const source = Game.getObjectById(creep.memory.harvesterDetail.targetSourceId);

    if (!source) {
      creep.say("⛏无目标");
      return;
    }

    // 查找 source 旁边的 container，站在上面采矿能量自动存入 container
    const container = creep.room.find(FIND_STRUCTURES, {
      filter: (s) => s.structureType === STRUCTURE_CONTAINER && s.pos.inRangeTo(source, 1),
    })[0] as StructureContainer | undefined;
    const targetPos = container ? container.pos : source.pos;

    if (creep.pos.isEqualTo(targetPos)) {
      creep.harvest(source);
      creep.say("⛏采矿中");
    } else {
      if (isSourceTooCrowded(source)) {
        creep.say("⛏拥挤");
        // 随机移动到附近2-3格的位置，避免堵路
        const offsetX = Math.floor(Math.random() * 5) - 2;
        const offsetY = Math.floor(Math.random() * 5) - 2;
        const fleeX = source.pos.x + offsetX;
        const fleeY = source.pos.y + offsetY;
        if (fleeX >= 0 && fleeX <= 49 && fleeY >= 0 && fleeY <= 49) {
          creep.moveTo(fleeX, fleeY);
        }
        return;
      }
      creep.say("⛏移动中");
      creep.moveTo(targetPos, {
        visualizePathStyle: { stroke: "#ffaa00" },
      });
    }
  },
  body: {
    template: [WORK, WORK, MOVE],
    maxRepeat: 5,
    minTemplate: [WORK, MOVE],
  },
  priority: (roomName) => {
    const creepNum = Memory.creepNumEachRoomEachType[roomName];
    // 0个时最紧急，1个时次紧急，2个以上正常
    if (creepNum[CreepRole.HARVESTER] == 0) return 10;
    if (creepNum[CreepRole.HARVESTER] == 1) return 8;
    return 5;
  },
};

export default harvesterConfig;
