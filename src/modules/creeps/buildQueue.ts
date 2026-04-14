import { CreepRole } from "./declareCreepRoleEnum";
import buildFactory from "./buildFactory";
import { creepConfig } from "./creepConfig";


/**
 * 向生产队列添加一个生产任务
 * @param spawn spawn
 * @param type 建造的creep类型，由CreepRole定义
 * @param mustUseAllEnergy 是否要建造最强壮那种
 */
const addMessage = (spawn: StructureSpawn, type: CreepRole, mustUseAllEnergy: boolean = true) => {
  if (spawn == null) {
    throw new Error(`buildQueue.ts: addMessage: spawn is null`);
  }
  Memory.buildQueue.push({
    spawnId: spawn.id,
    type,
    mustUseAllEnergy,
  });
};

/**
 * 用任务的优先级给任务排序，优先级高的排前面
 */
const sortBuildQueueByPriority = () => {
  // 过滤掉无效任务（spawn已不存在）
  Memory.buildQueue = Memory.buildQueue.filter((message) => {
    return Game.getObjectById(message.spawnId) != null;
  });

  // 缓存每个任务的优先级，避免排序时重复调用
  const priorityCache = new Map<string, number>();
  const getPriority = (message: { spawnId: Id<StructureSpawn>; type: CreepRole }) => {
    const key = `${message.spawnId}-${message.type}`;
    if (!priorityCache.has(key)) {
      const spawn = Game.getObjectById(message.spawnId);
      priorityCache.set(key, spawn ? creepConfig[message.type].priority(spawn.room.name) : 0);
    }
    return priorityCache.get(key);
  };

  Memory.buildQueue.sort((a, b) => getPriority(b) - getPriority(a));
};

/**
 * 根据优先级选择一个任务并执行
 */
const workMessage = () => {
  sortBuildQueueByPriority();
  const hashMap = new Map();

  for (let i = 0; i < Memory.buildQueue.length; i++) {
    const message = Memory.buildQueue[i];
    const spawn = Game.getObjectById(message.spawnId);
    if (!hashMap.has(message.spawnId) && spawn) {
      hashMap.set(message.spawnId, true);
      const result = buildFactory.buildCreep(
        spawn,
        message.type,
        // 如果优先级大于100则表示不必要全部能量都使用
        creepConfig[message.type].priority(spawn.room.name) > 100 ? false : message.mustUseAllEnergy
      );
      if (result == OK) {
        Memory.buildQueue.splice(i, 1);
        i--;
      }
    }
  }
};

/**
 * 得到每一个房间的每种creep的数量
 */
const getCreepNumber = () => {
  if (Memory.creepNumEachRoomEachType == null) Memory.creepNumEachRoomEachType = {};
  // console.log(`buildQueue.ts: getCreepNumber`);

  // 初始化creep数量
  Object.getOwnPropertyNames(Game.rooms).forEach((roomName) => {
    Memory.creepNumEachRoomEachType[roomName] = {
      [CreepRole.BUILDER]: 0,
      [CreepRole.HARVESTER]: 0,
      [CreepRole.TRANSFER]: 0,
      [CreepRole.UPGRADER]: 0,
      [CreepRole.REPAIRER]: 0,
      [CreepRole.CLAIMER]: 0,
      [CreepRole.SOLDIER]: 0,
    };
  });

  Object.getOwnPropertyNames(Game.creeps).forEach((creepName) => {
    const creep = Game.creeps[creepName];
    if (Memory.creepNumEachRoomEachType[creep.room.name] == null) {
      Memory.creepNumEachRoomEachType[creep.room.name] = {
        [CreepRole.BUILDER]: 0,
        [CreepRole.HARVESTER]: 0,
        [CreepRole.TRANSFER]: 0,
        [CreepRole.UPGRADER]: 0,
        [CreepRole.REPAIRER]: 0,
        [CreepRole.CLAIMER]: 0,
        [CreepRole.SOLDIER]: 0,
      };
    } else Memory.creepNumEachRoomEachType[creep.room.name][creep.memory.role]++;
  });
};

/**
 * 得到每一个房间的准备孵化的每种creep的数量
 */
const getSwaningCreepNumber = () => {
  if (Memory.spawningCreepNumEachRoomEachType == null) {
    Memory.spawningCreepNumEachRoomEachType = {};
  }

  Object.getOwnPropertyNames(Game.rooms).forEach((roomName) => {
    Memory.spawningCreepNumEachRoomEachType[roomName] = {
      [CreepRole.BUILDER]: 0,
      [CreepRole.HARVESTER]: 0,
      [CreepRole.TRANSFER]: 0,
      [CreepRole.UPGRADER]: 0,
      [CreepRole.REPAIRER]: 0,
      [CreepRole.CLAIMER]: 0,
      [CreepRole.SOLDIER]: 0,
    };
  });
  if (Memory.buildQueue == null) Memory.buildQueue = [];
  if (Memory.buildQueue.length > 0)
    Memory.buildQueue.forEach((message) => {
      const spawn = Game.getObjectById(message.spawnId);
      if (spawn) {
        Memory.spawningCreepNumEachRoomEachType[spawn.room.name][message.type]++;
      }
    });
};

/**
 * 检查creep数量并自动发布建造任务，启动建造流程
 */
const checkCreepNumberAndBuild = () => {
  getCreepNumber();
  getSwaningCreepNumber();
  for (const roomName in Game.rooms) {
    const room = Game.rooms[roomName];
    for (const role in Memory.creepNumEachRoomEachType[room.name]) {
      if (
        Memory.creepNumEachRoomEachType[room.name][role] + Memory.spawningCreepNumEachRoomEachType[room.name][role] <
        creepConfig[role].limitAmount(roomName)
      ) {
        for (
          let i = Memory.creepNumEachRoomEachType[room.name][role] + Memory.spawningCreepNumEachRoomEachType[room.name][role];
          i < creepConfig[role].limitAmount(roomName);
          i++
        ) {
          addMessage(room.find(FIND_MY_SPAWNS)[0], (role as unknown) as CreepRole);
        }
      }
    }
  }
  getSwaningCreepNumber();
  workMessage();
};

export default {
  addMessage,
  checkCreepNumberAndBuild,
};
