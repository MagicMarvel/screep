import { CreepRole } from "../creepRole";
import { findNearestStorage } from "../../utils/findNearestStorage";
import { PickupMethod, DeliveryMethod } from "../../transfer/transferQueue";
import { callbacks } from "../../callback/index";
import { findNearestEnergySource } from "../../utils/findNearestEnergySource";
import type { CreepRoleConfig } from "./creepRoleConfig";

const PRIORITY_RANGE_WEIGHT = 1000;

const RETURN_CODE_NAMES: Record<number, string> = {
    [OK]: 'OK',
    [ERR_NOT_OWNER]: 'ERR_NOT_OWNER',
    [ERR_NO_PATH]: 'ERR_NO_PATH',
    [ERR_BUSY]: 'ERR_BUSY',
    [ERR_NOT_FOUND]: 'ERR_NOT_FOUND',
    [ERR_NOT_ENOUGH_RESOURCES]: 'ERR_NOT_ENOUGH_RESOURCES',
    [ERR_INVALID_TARGET]: 'ERR_INVALID_TARGET',
    [ERR_FULL]: 'ERR_FULL',
    [ERR_NOT_IN_RANGE]: 'ERR_NOT_IN_RANGE',
    [ERR_INVALID_ARGS]: 'ERR_INVALID_ARGS',
    [ERR_TIRED]: 'ERR_TIRED',
    [ERR_NO_BODYPART]: 'ERR_NO_BODYPART',
    [ERR_RCL_NOT_ENOUGH]: 'ERR_RCL_NOT_ENOUGH',
    [ERR_GCL_NOT_ENOUGH]: 'ERR_GCL_NOT_ENOUGH',
};

function rc(code: number): string {
    return RETURN_CODE_NAMES[code] ?? String(code);
}

const transferConfig: CreepRoleConfig = {
  name: "Transfer",
  limitAmount: (roomName: string) => {
    const room = Game.rooms[roomName];
    if (!room) return 2;

    // 每个 source 至少配 2 个 transfer
    const sources = room.find(FIND_SOURCES);
    let amount = sources.length * 2;

    // RCL 越高能量流转越快，需要更多 transfer
    const controllerLevel = room.controller?.level || 1;
    if (controllerLevel >= 3) amount += 1;
    if (controllerLevel >= 5) amount += 1;
    if (controllerLevel >= 7) amount += 1;

    // 根据待搬运任务量动态增加（每2个积压任务多1个）
    const pendingTasks = Memory.transferQueue?.length || 0;
    amount += Math.floor(pendingTasks / 2);

    return amount;
  },
  extraMemory: (spawn) => {
    return {
      transferDetail: {
        preTaskStorageTargetId: null,
        working: false,
        task: {},
        maxCarry: null,
        hasPickedUp: null,
      },
    };
  },
  work: (creep: Creep): void => {
    function finishTransferWork(creep: Creep) {
      creep.memory.transferDetail.working = false;
      creep.memory.transferDetail.hasPickedUp = false;
      callbacks[creep.memory.transferDetail.callback](...creep.memory.transferDetail.callbackParams);
    }

    function pickTaskFromQueue(creep: Creep): boolean {
      if (!Memory.transferQueue || Memory.transferQueue.length == 0) return false;

      const freeCapacity = creep.store.getFreeCapacity(RESOURCE_ENERGY);
      let bestTaskIndex = -1;
      let minScore: number = Infinity;

      for (let i = 0; i < Memory.transferQueue.length; i++) {
        const task = Memory.transferQueue[i];
        const toObj = Game.getObjectById(task.to);
        if (toObj == null) {
          Memory.transferQueue.splice(i, 1);
          callbacks[task.callback](...task.callbackParams);
          i--;
        } else {
          let fromObj = Game.getObjectById(task.from);
          if (fromObj == null) {
            fromObj = findNearestEnergySource(toObj);
            if (fromObj) {
              Memory.transferQueue[i].from = fromObj.id;
              // 替代的 from 是结构体，需要改为 withdraw
              if (!(fromObj instanceof Resource)) {
                Memory.transferQueue[i].pickupMethod = PickupMethod.Withdraw;
              }
            }
          }
          if (fromObj && freeCapacity > 0 && fromObj.room == creep.room) {
            const range = creep.pos.getRangeTo(fromObj.pos);
            const priority = task.priority || 0;
            // 优先级为主要排序（数值越小越紧急），距离为次要排序
            const score = priority * PRIORITY_RANGE_WEIGHT + range;
            if (score < minScore) {
              minScore = score;
              bestTaskIndex = i;
            }
          }
        }
      }

      if (bestTaskIndex === -1 || !Memory.transferQueue.length) return false;

      const task = Memory.transferQueue[bestTaskIndex];
      const sourceObj = Game.getObjectById(task.from);
      const targetObj = Game.getObjectById(task.to);
      console.log(`${creep.name} 接取任务 从 ${sourceObj} 到 ${targetObj}`);
      creep.say("📦接任务");
      creep.memory.transferDetail.callback = task.callback;
      creep.memory.transferDetail.callbackParams = task.callbackParams;
      creep.memory.transferDetail.task = task;
      // 身上有能量且已满则跳过去 from 的步骤，直接去 to
      creep.memory.transferDetail.hasPickedUp = creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0 && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0;
      creep.memory.transferDetail.working = true;
      Memory.transferQueue.splice(bestTaskIndex, 1);
      return true;
    }

    if (creep.spawning) return;

    if (Memory.transferMaximum == null) Memory.transferMaximum = creep.store.getCapacity();
    else Memory.transferMaximum = Math.max(Memory.transferMaximum, creep.store.getCapacity());

    // ===== 工作阶段：运输 =====
    if (creep.memory.transferDetail.working) {
      const transferDetail = creep.memory.transferDetail;
      const energy = creep.store.getUsedCapacity(RESOURCE_ENERGY);
      const capacity = creep.store.getCapacity();

      // 已到达 from，去 to 交付
      if (creep.memory.transferDetail.hasPickedUp) {
        const to = Game.getObjectById(transferDetail.task.to);
        if (to == null || to.store.getFreeCapacity(creep.memory.transferDetail.task.resourceType) == 0) {
          console.log(`${creep.name} [放弃] to已满或不存在, to:${to}, 身上能量:${energy}/${capacity}`);
          creep.say("📦已放弃");
          finishTransferWork(creep);
          return;
        }

        if (creep.memory.transferDetail.task.deliveryMethod == DeliveryMethod.Transfer) {
          const transferResult = creep.transfer(to, RESOURCE_ENERGY);
          if (
            (transferResult == ERR_NOT_IN_RANGE || transferResult == ERR_BUSY) &&
            to.store.getFreeCapacity(creep.memory.transferDetail.task.resourceType) > 0
          ) {
            creep.say("📦送达中");
            creep.moveTo(to);
          } else if (transferResult == OK && creep.memory.transferDetail.working) {
            creep.say("📦已完成");
            finishTransferWork(creep);
          } else {
            console.log(
              `[ERROR] ${creep.name} 交付失败: ${rc(transferResult)}, 身上能量:${energy}/${capacity}, 任务:${JSON.stringify(
                transferDetail.task,
                (_key, value) => typeof value === 'number' && (PickupMethod[value] || DeliveryMethod[value]) ? PickupMethod[value] || DeliveryMethod[value] : value
              )}`
            );
            creep.say("📦已放弃");
            finishTransferWork(creep);
          }
        }
        return;
      }

      // 未到达 from，去 from 拾取
      const from = Game.getObjectById(transferDetail.task.from);
      if (
        from == null ||
        (from instanceof Resource && (from.amount == 0 || from.amount == undefined)) ||
        ("store" in from && from.store.getUsedCapacity(RESOURCE_ENERGY) === 0)
      ) {
        console.log(`${creep.name} from无效，寻找替代: from=${from}, fromType=${PickupMethod[transferDetail.task.pickupMethod]}`);
        let newFrom: StructureContainer | Resource<ResourceConstant> | Tombstone | Ruin | StructureStorage | StructureSpawn | StructureExtension | null = findNearestEnergySource(creep, transferDetail.task.amount);
        if (newFrom == null) {
          newFrom = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
            filter: (s) =>
              (s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION) &&
              s.store.getUsedCapacity(RESOURCE_ENERGY) > 0,
          }) as StructureSpawn | StructureExtension | null;
        }
        if (newFrom == null) {
          console.log(`${creep.name} [放弃] 找不到替代from`);
          creep.say("📦已放弃");
          finishTransferWork(creep);
          return;
        }
        transferDetail.task.from = newFrom.id as Id<Resource<ResourceConstant>> | Id<Tombstone> | Id<Ruin> | Id<StructureContainer> | Id<StructureStorage>;
        if (!(newFrom instanceof Resource)) {
          transferDetail.task.pickupMethod = PickupMethod.Withdraw;
        }
        console.log(`${creep.name} 替代from: ${newFrom}, 类型: ${PickupMethod[transferDetail.task.pickupMethod]}`);
      }

      if (creep.memory.transferDetail.task.pickupMethod == PickupMethod.Pickup) {
        const fromTarget = Game.getObjectById(creep.memory.transferDetail.task.from);
        const pickupResult = creep.pickup(<Resource<ResourceConstant>>fromTarget);
        if (pickupResult == ERR_NOT_IN_RANGE) {
          creep.say("📦拾取中");
          creep.moveTo(fromTarget);
        } else if (pickupResult == OK) {
          creep.memory.transferDetail.hasPickedUp = true;
        } else if (pickupResult == ERR_FULL) {
          // 已满，跳过 from 直接去交付
          if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            creep.memory.transferDetail.hasPickedUp = true;
          }
        } else {
          console.log(`${creep.name} pickup失败: ${rc(pickupResult)}, from=${fromTarget}`);
        }
      }

      if (creep.memory.transferDetail.task.pickupMethod == PickupMethod.Withdraw) {
        const fromTarget = Game.getObjectById(creep.memory.transferDetail.task.from);
        const withdrawResult = creep.withdraw(<Structure<StructureConstant> | Tombstone | Ruin>fromTarget, RESOURCE_ENERGY);
        if (withdrawResult == ERR_NOT_IN_RANGE) {
          creep.say("📦提取中");
          creep.moveTo(fromTarget);
        } else if (withdrawResult == OK) {
          creep.memory.transferDetail.hasPickedUp = true;
        } else if (withdrawResult == ERR_FULL) {
          if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            creep.memory.transferDetail.hasPickedUp = true;
          }
        } else {
          console.log(`${creep.name} withdraw失败: ${rc(withdrawResult)}, from=${fromTarget}`);
        }
      }

      return;
    }

    // ===== 空闲阶段 =====

    // 有队列任务则直接接任务（不管身上有没有能量）
    if (pickTaskFromQueue(creep)) return;

    // 没有队列任务，处理多余能量
    if (creep.store.getUsedCapacity() > 0) {
      // 已知目标，去放能量
      if (creep.memory.transferDetail.preTaskStorageTargetId != null) {
        const target = Game.getObjectById(creep.memory.transferDetail.preTaskStorageTargetId);
        if (!target || ("store" in target && target.store.getFreeCapacity(RESOURCE_ENERGY) == 0)) {
          creep.memory.transferDetail.preTaskStorageTargetId = null;
          return;
        }
        const transferResult = creep.transfer(target, RESOURCE_ENERGY);
        if (transferResult == ERR_NOT_IN_RANGE) {
          creep.say("📦送余能");
          creep.moveTo(target);
        } else if (transferResult == OK) {
          creep.memory.transferDetail.preTaskStorageTargetId = null;
        } else {
          creep.memory.transferDetail.preTaskStorageTargetId = null;
        }
        return;
      }

      // extension > spawn > container > worker creep
      const extension = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
        filter: (s): s is StructureExtension => s.structureType == STRUCTURE_EXTENSION && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0,
      });
      if (extension) {
        creep.memory.transferDetail.preTaskStorageTargetId = extension.id;
        return;
      }

      const spawn = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
        filter: (s): s is StructureSpawn => s.structureType == STRUCTURE_SPAWN && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0,
      });
      if (spawn) {
        creep.memory.transferDetail.preTaskStorageTargetId = spawn.id;
        return;
      }

      const container = findNearestStorage(creep);
      if (container) {
        creep.memory.transferDetail.preTaskStorageTargetId = container.id;
        return;
      }

      const nearbyWorker = creep.pos.findClosestByRange(FIND_MY_CREEPS, {
        filter: (c) =>
          c.id != creep.id &&
          c.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
          (c.memory.role == CreepRole.UPGRADER || c.memory.role == CreepRole.BUILDER || c.memory.role == CreepRole.REPAIRER),
      });
      if (nearbyWorker) {
        creep.memory.transferDetail.preTaskStorageTargetId = nearbyWorker.id;
        return;
      }
    }

    // 无能量无任务，待命
    creep.say("📦待命中");

    // 离其他 creep 太近则远离，避免堵路
    const nearbyCreep = creep.pos.findClosestByRange(FIND_MY_CREEPS, {
      filter: (c) => c.id !== creep.id && creep.pos.getRangeTo(c) <= 1,
    });
    if (nearbyCreep) {
      const dx = creep.pos.x - nearbyCreep.pos.x;
      const dy = creep.pos.y - nearbyCreep.pos.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      creep.moveTo(creep.pos.x + Math.round(dx / len * 2), creep.pos.y + Math.round(dy / len * 2));
      return;
    }

    const spawn = creep.room.find(FIND_MY_SPAWNS)[0];
    if (spawn && creep.pos.getRangeTo(spawn) <= 1) {
      const offsetX = Math.floor(Math.random() * 5) - 2;
      const offsetY = Math.floor(Math.random() * 5) - 2;
      creep.moveTo(spawn.pos.x + offsetX, spawn.pos.y + offsetY);
    }
  },
  body: {
    template: [CARRY, CARRY, MOVE],
    maxRepeat: 7,
    minTemplate: [CARRY, MOVE],
  },
  priority: (roomName) => {
    const creepNum = Memory.creepNumEachRoomEachType[roomName];
    if (creepNum[CreepRole.TRANSFER] == 0) return 9;
    if (creepNum[CreepRole.TRANSFER] <= 2) return 7;
    return 4;
  },
};

export default transferConfig;
