import { sortBy } from "lodash";
import getEnergyFromStructure from "../utils/getEnergyFromStructure";
import { CreepRole } from "./declareCreepRoleEnum";
import { findTheNearestContainerWithCapacity } from "../utils/findTheNearestContainerWithCapacity";
import { FromTaskType, ToTaskType, TransferQueueItem } from "../transfer/transferQueue";
import { callbacks } from "../../modules/callback/index";
import creepTakeEnergy from "../transfer/creepTakeEnergy";
import buildFactory from "./buildFactory";
import { findTheNearestContainerWithEnergy } from "../utils/findTheNearestContainerWithEnergy";
import { getMark, setMark } from "../utils/markController";
import { isSourceTooCrowded } from "../utils/isSourceTooCrowded";

type CreepConfig = {
  [creepRole in CreepRole]: {
    name: string;
    limitAmount: number | ((roomName: string) => number);
    extraMemory: (spawn: StructureSpawn) => {};
    work: (creep: Creep) => void;
    body: {
      template: BodyPartConstant[];
      maxRepeat: number;
      minTemplate?: BodyPartConstant[]; // 能量不够 template 时的最小可用模板
    };
    priority: (roomName: string) => number;
  };
};

export const creepConfig: CreepConfig = {
  [CreepRole.HARVESTER]: {
    name: "Harvester",
    limitAmount: (roomName: string) => {
      const room = Game.rooms[roomName];
      if (!room) return 2;
      return room.find(FIND_SOURCES).length * 2;
    },
    extraMemory: (spawn: StructureSpawn) => {
      const sources = spawn.room.find(FIND_SOURCES);
      const harvestingEachSourceCreepNum: { [sourceId: Id<Source>]: number } = {};

      // 只遍历同房间的harvester，而非所有creep
      for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        if (creep.room.name != spawn.room.name) continue;
        if (creep.memory.role == CreepRole.HARVESTER) {
          const sourceId = creep.memory.harvesterDetail.harvesterWhich;
          harvestingEachSourceCreepNum[sourceId] = (harvestingEachSourceCreepNum[sourceId] || 0) + 1;
        }
      }

      // 优先分配给没有harvester的source
      for (const source of sources) {
        if (!harvestingEachSourceCreepNum[source.id]) {
          return { harvesterDetail: { harvesterWhich: source.id } };
        }
      }

      // 然后分配给harvester未满2个的source
      for (const sourceId in harvestingEachSourceCreepNum) {
        if (harvestingEachSourceCreepNum[sourceId] < 2) {
          return {
            harvesterDetail: {
              harvesterWhich: sourceId as Id<Source>,
            },
          };
        }
      }
    },
    work: function run(creep: Creep) {
      const source = Game.getObjectById(creep.memory.harvesterDetail.harvesterWhich);

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
  },
  [CreepRole.UPGRADER]: {
    name: "Upgrader",
    limitAmount: (roomName: string) => {
      return 2;
    },
    extraMemory: (spawn) => {
      return {
        upgradeDetail: { upgrading: false },
      };
    },
    work: function (creep: Creep) {
      if (creep.store.getUsedCapacity() === 0) {
        creep.say("⬆等能量");
        creepTakeEnergy(creep);
        return;
      }
      creepTakeEnergy(creep);

      if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
        creep.say("⬆移动中");
        creep.moveTo(creep.room.controller);
      } else {
        creep.say("⬆升级中");
      }
    },
    body: {
      template: [WORK, WORK, CARRY, MOVE],
      maxRepeat: 5,
      minTemplate: [WORK, CARRY, MOVE],
    },
    priority: (roomName) => {
      const creepNum = Memory.creepNumEachRoomEachType[roomName];
      if (creepNum[CreepRole.UPGRADER] == 0) return 6;
      return 3;
    },
  },
  [CreepRole.BUILDER]: {
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
          buildingWhich: null,
        },
      };
    },
    work: (creep: Creep) => {
      // 能量不足时预约补给，但不中断工作
      if (creep.store.getUsedCapacity() === 0) {
        if (creep.memory.builderDetail.buildingWhich == null) creep.moveTo(Game.flags["Flag1"]);
        creep.say("🔨等能量");
        creepTakeEnergy(creep);
        return;
      }
      creepTakeEnergy(creep);

      // 没有建造目标，选择一个
      if (creep.memory.builderDetail.buildingWhich == null || Game.getObjectById(creep.memory.builderDetail.buildingWhich) == null) {
        const targets = creep.room.find(FIND_CONSTRUCTION_SITES).filter(
          (site) => !Memory.badBuildTargets?.[site.id] || Memory.badBuildTargets[site.id] < Game.time
        );
        if (targets.length) {
          creep.memory.builderDetail.buildingWhich = targets[0].id;
        } else {
          creep.say("🔨空闲中");
        }
        return;
      }

      // 去建造
      const buildingTarget = Game.getObjectById(creep.memory.builderDetail.buildingWhich);
      if (!buildingTarget || !(buildingTarget instanceof ConstructionSite)) {
        creep.memory.builderDetail.buildingWhich = null;
        return;
      }

      // 建造目标已完成或不在同一房间
      if (buildingTarget.progress === buildingTarget.progressTotal || buildingTarget.room?.name !== creep.room.name) {
        creep.say("🔨完成");
        creep.memory.builderDetail.buildingWhich = null;
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
        Memory.badBuildTargets[buildingTarget.id] = Game.time + 100;
        creep.memory.builderDetail.buildingWhich = null;
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
  },
  [CreepRole.CLAIMER]: {
    name: "Claimer",
    limitAmount: (roomName: string) => {
      return 0;
    },
    extraMemory: (spawn) => {
      return {
        claimerDetail: {
          claiming: false,
        },
      };
    },
    work: (creep: Creep) => {
      if (!creep.memory.claimerDetail.claiming) {
        creep.say("🚩取能量");
        getEnergyFromStructure(creep);
        return;
      }

      if (creep.claimController(creep.room.controller) == ERR_NOT_IN_RANGE) {
        creep.say("🚩移动中");
        creep.moveTo(creep.room.controller);
      } else {
        creep.say("🚩占领中");
      }
    },
    body: {
      template: [CLAIM, MOVE],
      maxRepeat: 1,
    },
    priority: (roomName) => {
      let basePriority = 1;

      return basePriority;
    },
  },
  [CreepRole.REPAIRER]: {
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
          repairingWhich: null,
        },
      };
    },
    work: (creep: Creep) => {
      // 能量不足时预约补给，但不中断工作
      if (creep.store.getUsedCapacity() === 0) {
        if (creep.memory.repairerDetail.repairingWhich == null) creep.moveTo(Game.flags["Flag1"]);
        creep.say("🔧等能量");
        creepTakeEnergy(creep);
        return;
      }
      creepTakeEnergy(creep);

      const repairTarget = Game.getObjectById(creep.memory.repairerDetail.repairingWhich);
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
              creep.memory.repairerDetail.repairingWhich = target.id;
              minHitsRatio = target.hits / target.hitsMax;
            }
          });
        } else {
          creep.say("🔧空闲中");
          creep.memory.repairerDetail.repairingWhich = null;
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
        creep.memory.repairerDetail.repairingWhich = null;
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
  },
  [CreepRole.SOLDIER]: {
    name: "Soldier",
    limitAmount: (roomName: string) => {
      return 0;
    },
    extraMemory: (spawn) => {
      return {};
    },
    work: (creep: Creep) => {
      const enemy = creep.room.find(FIND_HOSTILE_CREEPS);
      if (enemy.length > 0) {
        if (creep.attack(enemy[0]) == ERR_NOT_IN_RANGE) {
          creep.say("⚔追击中");
          creep.moveTo(enemy[0]);
        } else {
          creep.say("⚔攻击中");
        }
        return;
      }

      creep.say("⚔巡逻中");
      creep.moveTo(Game.flags.Flag1);
    },
    body: {
      template: [ATTACK, ATTACK, MOVE],
      maxRepeat: 5,
    },
    priority: (roomName) => {
      let basePriority = 1;
      const creepNum = Memory.creepNumEachRoomEachType[roomName];
      if (
        creepNum[CreepRole.SOLDIER] == 0 &&
        Game.rooms[roomName].find(FIND_HOSTILE_CREEPS, {
          filter: (creep) => creep.body.filter((part) => part.type == "attack").length > 0,
        })
      ) {
        basePriority *= 100;
      }
      return basePriority;
    },
  },
  [CreepRole.TRANSFER]: {
    name: "Transfer",
    limitAmount: (roomName: string) => {
      const room = Game.rooms[roomName];
      if (!room) return 2;

      // 每个 source 至少配 2 个 transfer
      const sources = room.find(FIND_SOURCES);
      let amount = sources.length * 2;

      // RCL 越高能量流转越快，需要更多 transfer
      const rcl = room.controller?.level || 1;
      if (rcl >= 3) amount += 1;
      if (rcl >= 5) amount += 1;
      if (rcl >= 7) amount += 1;

      // 根据待搬运任务量动态增加（每2个积压任务多1个）
      const pendingTasks = Memory.transferQueue?.length || 0;
      amount += Math.floor(pendingTasks / 2);

      return amount;
    },
    extraMemory: (spawn) => {
      return {
        transferDetail: {
          storeStructureBeforeWorking: null,
          working: false,
          task: {},
          maxCarry: null,
          arriveFrom: null,
        },
      };
    },
    work: (creep: Creep): void => {
      function finishTransferWork(creep: Creep) {
        creep.memory.transferDetail.working = false;
        creep.memory.transferDetail.arriveFrom = false;
        callbacks[creep.memory.transferDetail.callback](...creep.memory.transferDetail.callbackParams);
      }

      function pickTaskFromQueue(creep: Creep): boolean {
        if (!Memory.transferQueue || Memory.transferQueue.length == 0) return false;

        const creepCarry = creep.store.getFreeCapacity(RESOURCE_ENERGY);
        let minMessageIndex = -1;
        let minScore: number = Infinity;

        for (let i = 0; i < Memory.transferQueue.length; i++) {
          const message = Memory.transferQueue[i];
          const toObj = Game.getObjectById(message.to);
          if (toObj == null) {
            Memory.transferQueue.splice(i, 1);
            callbacks[message.callback](...message.callbackParams);
            i--;
          } else {
            let fromObj = Game.getObjectById(message.from);
            if (fromObj == null) {
              fromObj = findTheNearestContainerWithEnergy(toObj);
              if (fromObj) {
                Memory.transferQueue[i].from = fromObj.id;
                // 替代的 from 是结构体，需要改为 withdraw
                if (!(fromObj instanceof Resource)) {
                  Memory.transferQueue[i].fromTaskType = FromTaskType.withdraw;
                }
              }
            }
            if (fromObj && creepCarry > 0 && fromObj.room == creep.room) {
              const range = creep.pos.getRangeTo(fromObj.pos);
              const priority = message.priority || 0;
              // 优先级为主要排序（数值越小越紧急），距离为次要排序
              const score = priority * 1000 + range;
              if (score < minScore) {
                minScore = score;
                minMessageIndex = i;
              }
            }
          }
        }

        if (minMessageIndex === -1 || !Memory.transferQueue.length) return false;

        const message = Memory.transferQueue[minMessageIndex];
        const taskFrom = Game.getObjectById(message.from);
        const taskTo = Game.getObjectById(message.to);
        console.log(`${creep.name} 接取任务 从 ${taskFrom} 到 ${taskTo}`);
        creep.say("📦接任务");
        creep.memory.transferDetail.callback = message.callback;
        creep.memory.transferDetail.callbackParams = message.callbackParams;
        creep.memory.transferDetail.task = message;
        // 身上有能量且已满则跳过去 from 的步骤，直接去 to
        creep.memory.transferDetail.arriveFrom = creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0 && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0;
        creep.memory.transferDetail.working = true;
        Memory.transferQueue.splice(minMessageIndex, 1);
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
        if (creep.memory.transferDetail.arriveFrom) {
          const to = Game.getObjectById(transferDetail.task.to);
          if (to == null || to.store.getFreeCapacity(creep.memory.transferDetail.task.resourceType) == 0) {
            console.log(`${creep.name} [放弃] to已满或不存在, to:${to}, 身上能量:${energy}/${capacity}`);
            creep.say("📦已放弃");
            finishTransferWork(creep);
            return;
          }

          if (creep.memory.transferDetail.task.toTaskType == ToTaskType.transfer) {
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
                `[ERROR] ${creep.name} 交付失败: ${transferResult}, 身上能量:${energy}/${capacity}, 任务:${JSON.stringify(transferDetail.task)}`
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
          console.log(`${creep.name} from无效，寻找替代: from=${from}, fromType=${transferDetail.task.fromTaskType}`);
          let newFrom = findTheNearestContainerWithEnergy(creep, transferDetail.task.amount);
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
          transferDetail.task.from = newFrom.id;
          if (!(newFrom instanceof Resource)) {
            transferDetail.task.fromTaskType = FromTaskType.withdraw;
          }
          console.log(`${creep.name} 替代from: ${newFrom}, 类型: ${transferDetail.task.fromTaskType}`);
        }

        if (creep.memory.transferDetail.task.fromTaskType == FromTaskType.pickup) {
          const fromTarget = Game.getObjectById(creep.memory.transferDetail.task.from);
          const pickupResult = creep.pickup(<Resource<ResourceConstant>>fromTarget);
          if (pickupResult == ERR_NOT_IN_RANGE) {
            creep.say("📦拾取中");
            creep.moveTo(fromTarget);
          } else if (pickupResult == OK) {
            creep.memory.transferDetail.arriveFrom = true;
          } else if (pickupResult == ERR_FULL) {
            // 已满，跳过 from 直接去交付
            if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
              creep.memory.transferDetail.arriveFrom = true;
            }
          } else {
            console.log(`${creep.name} pickup失败: ${pickupResult}, from=${fromTarget}`);
          }
        }

        if (creep.memory.transferDetail.task.fromTaskType == FromTaskType.withdraw) {
          const fromTarget = Game.getObjectById(creep.memory.transferDetail.task.from);
          const withdrawResult = creep.withdraw(<Structure<StructureConstant> | Tombstone | Ruin>fromTarget, RESOURCE_ENERGY);
          if (withdrawResult == ERR_NOT_IN_RANGE) {
            creep.say("📦提取中");
            creep.moveTo(fromTarget);
          } else if (withdrawResult == OK) {
            creep.memory.transferDetail.arriveFrom = true;
          } else if (withdrawResult == ERR_FULL) {
            if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
              creep.memory.transferDetail.arriveFrom = true;
            }
          } else {
            console.log(`${creep.name} withdraw失败: ${withdrawResult}, from=${fromTarget}`);
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
        if (creep.memory.transferDetail.storeStructureBeforeWorking != null) {
          const target = Game.getObjectById(creep.memory.transferDetail.storeStructureBeforeWorking);
          if (!target || ("store" in target && target.store.getFreeCapacity(RESOURCE_ENERGY) == 0)) {
            creep.memory.transferDetail.storeStructureBeforeWorking = null;
            return;
          }
          const transferResult = creep.transfer(target, RESOURCE_ENERGY);
          if (transferResult == ERR_NOT_IN_RANGE) {
            creep.say("📦送余能");
            creep.moveTo(target);
          } else if (transferResult == OK) {
            creep.memory.transferDetail.storeStructureBeforeWorking = null;
          } else {
            creep.memory.transferDetail.storeStructureBeforeWorking = null;
          }
          return;
        }

        // extension > spawn > container > worker creep
        const extension = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
          filter: (s) => s.structureType == STRUCTURE_EXTENSION && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0,
        });
        if (extension) {
          creep.memory.transferDetail.storeStructureBeforeWorking = extension.id;
          return;
        }

        const spawn = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
          filter: (s) => s.structureType == STRUCTURE_SPAWN && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0,
        });
        if (spawn) {
          creep.memory.transferDetail.storeStructureBeforeWorking = spawn.id;
          return;
        }

        const container = findTheNearestContainerWithCapacity(creep);
        if (container) {
          creep.memory.transferDetail.storeStructureBeforeWorking = container.id;
          return;
        }

        const nearbyWorker = creep.pos.findClosestByRange(FIND_MY_CREEPS, {
          filter: (c) =>
            c.id != creep.id &&
            c.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
            (c.memory.role == CreepRole.UPGRADER || c.memory.role == CreepRole.BUILDER || c.memory.role == CreepRole.REPAIRER),
        });
        if (nearbyWorker) {
          creep.memory.transferDetail.storeStructureBeforeWorking = nearbyWorker.id;
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
  },
};
