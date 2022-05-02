import { CreepRole } from "./creeps/declareCreepRoleEnum";
export enum creepType {
  harvester,
  builder,
  upgrader,
  repairer,
  claimer,
  transfer,
}

const getBody: (energy: number, type: creepType) => BodyPartConstant[] = (
  energy,
  type
) => {
  // 一个MOVE，最多5个WORK
  const getHarvesterBody = (energy: number) => {
    let body = [];
    let bodyCost = 0;
    let workNum = 0;
    body.push(MOVE);
    while (bodyCost + BODYPART_COST[WORK] < energy) {
      body.push(WORK);
      workNum++;
      if (workNum >= 5) return body;
      bodyCost += BODYPART_COST[WORK];
    }
    return body;
  };

  // 一个MOVE，剩下的全部WORK+CARRY，upgrader也一样
  let getUpgraderBody;
  const getBuilderBody = (getUpgraderBody = (energy: number) => {
    let body = [];
    let bodyCost = 0;
    body.push(MOVE);
    while (bodyCost + BODYPART_COST[WORK] + BODYPART_COST[CARRY] < energy) {
      body.push(WORK, CARRY);
      bodyCost += BODYPART_COST[WORK] + BODYPART_COST[CARRY];
    }
    return body;
  });

  // 尽量装MOVE和CARRY
  const getTransferBody = (energy: number) => {
    let body = [];
    let bodyCost = 0;
    while (bodyCost + BODYPART_COST[MOVE] + BODYPART_COST[CARRY] < energy) {
      body.push(MOVE, CARRY);
      bodyCost += BODYPART_COST[MOVE] + BODYPART_COST[CARRY];
    }
    if (bodyCost + BODYPART_COST[MOVE] < energy) {
      body.push(MOVE);
      bodyCost += BODYPART_COST[MOVE];
    }
    return body;
  };

  // 修理既要能量也要移动还要工作部件
  const getRepairerBody = (energy: number) => {
    let body = [];
    let bodyCost = 0;
    while (
      bodyCost +
        BODYPART_COST[WORK] +
        BODYPART_COST[CARRY] +
        BODYPART_COST[MOVE] <
      energy
    ) {
      body.push(WORK, CARRY, MOVE);
      bodyCost +=
        BODYPART_COST[WORK] + BODYPART_COST[CARRY] + BODYPART_COST[MOVE];
    }
    if (bodyCost + BODYPART_COST[WORK] < energy) {
      body.push(WORK);
      bodyCost += BODYPART_COST[WORK];
    }

    if (bodyCost + BODYPART_COST[MOVE] < energy) {
      body.push(MOVE);
      bodyCost += BODYPART_COST[MOVE];
    }
    return body;
  };

  const getClaimerBody = (energy: number) => {
    let body = [];
    let bodyCost = 0;
    while (bodyCost + BODYPART_COST[MOVE] + BODYPART_COST[CLAIM] < energy) {
      body.push(MOVE, CLAIM);
      bodyCost += BODYPART_COST[MOVE] + BODYPART_COST[CLAIM];
    }
    if (bodyCost + BODYPART_COST[MOVE] < energy) {
      body.push(MOVE);
      bodyCost += BODYPART_COST[MOVE];
    }
    return body;
  };

  switch (type) {
    case creepType.harvester:
      return getHarvesterBody(energy);
    case creepType.builder:
      return getBuilderBody(energy);
    case creepType.upgrader:
      return getUpgraderBody(energy);
    case creepType.repairer:
      return getRepairerBody(energy);
    case creepType.claimer:
      return getClaimerBody(energy);
    case creepType.transfer:
      return getTransferBody(energy);
    default:
      return getHarvesterBody(energy);
  }
};

const getName = (type: creepType) => {
  switch (type) {
    case creepType.harvester:
      return "Harvester" + Game.time;
    case creepType.builder:
      return "Builder" + Game.time;
    case creepType.upgrader:
      return "Upgrader" + Game.time;
    case creepType.repairer:
      return "Repairer" + Game.time;
    case creepType.claimer:
      return "Claimer" + Game.time;
    case creepType.transfer:
      return "Transfer" + Game.time;
    default:
      return "Harvester" + Game.time;
  }
};

const getMemory = (type: creepType): CreepMemory => {
  let memory: {
    role: CreepRole;
    lowPower: boolean;
  };
  memory.lowPower = true;
  switch (type) {
    case creepType.harvester:
      memory.role = CreepRole.HARVESTER;
      break;

    case creepType.builder:
      memory.role = CreepRole.BUILDER;
      break;
    case creepType.upgrader:
      memory.role = CreepRole.UPGRADER;
      break;
    case creepType.repairer:
      memory.role = CreepRole.REPAIRER;
      break;
    case creepType.claimer:
      memory.role = CreepRole.CLAIMER;
      break;
    case creepType.transfer:
      memory.role = CreepRole.TRANSFER;
      break;
    default:
      memory.role = CreepRole.HARVESTER;
      break;
  }
  return memory;
};

/**
 * 创建一个新的Creep
 * @param{StructureSpawn} spawn 要用哪一个spawn
 * @param{creepType} type 要创建哪种类型的Creep
 * @param{boolean} mustUseAllEnergy 是否必须使用所有能量（即生产最强壮的，默认为true）
 * @returns{ScreepsReturnCode} 返回spawnCreep执行结果
 */
export default (
  spawn: StructureSpawn,
  type: creepType,
  mustUseAllEnergy: boolean = true
): ScreepsReturnCode => {
  let energy =
    mustUseAllEnergy == true
      ? spawn.room.energyCapacityAvailable
      : spawn.room.energyAvailable;
  let body = getBody(energy, type);
  let name = getName(type);
  let memory = getMemory(type);
  let result = spawn.spawnCreep(body, name, { memory });
  return result;
};
