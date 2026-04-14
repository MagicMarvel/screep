import { sortBy } from "lodash";
import getEnergyFromStructure from "../utils/getEnergyFromStructure";
import { CreepRole } from "./declareCreepRoleEnum";
import { findTheNearestContainerWithCapacity } from "../utils/findTheNearestContainerWithCapacity";
import { FromTaskType, ToTaskType, TransferQueueItem } from "../transfer/transferQueue";
import { callbacks } from "../../modules/callback/index";
import creepTakeEnergy from "../transfer/creepTakeEnergy";
import buildFactory from "./buildFactory";
import { findTheNearestContainerWithEnergy } from "../utils/findTheNearestContainerWithEnergy";

type CreepConfig = {
    [creepRole in CreepRole]: {
        name: string;
        limitAmount: number | ((roomName: string) => number);
        extraMemory: (spawn: StructureSpawn) => {};
        work: (creep: Creep) => void;
        body: {
            basic: BodyPartConstant[];
            prefer: BodyPartConstant[];
            want: BodyPartConstant[];
        };
        priority: (roomName: string) => number;
    };
};

export const creepConfig: CreepConfig = {
    [CreepRole.HARVESTER]: {
        name: "Harvester",
        limitAmount: (roomName: string) => {
            return 4;
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
            // 要采集哪一个资源
            let source = Game.getObjectById(creep.memory.harvesterDetail.harvesterWhich);

            // 当资源点不在范围内的时候，移动过去
            if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
                creep.moveTo(source, {
                    visualizePathStyle: { stroke: "#ffaa00" },
                });
            }
        },
        body: {
            basic: [MOVE],
            prefer: [WORK],
            want: [],
        },
        priority: (roomName) => {
            let basePriority = 9;
            const creepNum = Memory.creepNumEachRoomEachType[roomName];
            if (creepNum[CreepRole.HARVESTER] == 0) {
                basePriority *= 100;
            }
            if (creepNum[CreepRole.HARVESTER] == 1 && creepNum[CreepRole.TRANSFER] > 2) {
                basePriority *= 100;
            }
            // console.log(`creepRole: basePriority ${basePriority}`);

            return basePriority;
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
        work: function(creep: Creep) {
            // 如果这个creep没有能量的话，就去收集能量
            if (creep.store.getUsedCapacity() < 100) {
                creepTakeEnergy(creep, 1);
            } else if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller);
            }
        },
        body: {
            basic: [MOVE],
            prefer: [WORK, CARRY],
            want: [MOVE],
        },
        priority: (roomName) => {
            let basePriority = 7;
            const creepNum = Memory.creepNumEachRoomEachType[roomName];
            if (creepNum[CreepRole.UPGRADER] < 1) {
                basePriority *= 100;
            }
            return basePriority;
        },
    },
    [CreepRole.BUILDER]: {
        name: "Builder",
        limitAmount: (roomName: string) => {
            return 4;
        },
        extraMemory: (spawn) => {
            return {
                builderDetail: {
                    buildingWhich: null,
                },
            };
        },
        work: (creep: Creep) => {
            // 没有能量的时候，就去收集能量
            if (creep.store.getUsedCapacity() < 100) {
                if (creep.memory.builderDetail.buildingWhich == null) creep.moveTo(Game.flags["Flag1"]);
                creepTakeEnergy(creep);
            } else if (creep.memory.builderDetail.buildingWhich == null || Game.getObjectById(creep.memory.builderDetail.buildingWhich) == null) {
                // 选择一个可建的去建造
                let targets = creep.room.find(FIND_CONSTRUCTION_SITES);
                if (targets.length) {
                    creep.memory.builderDetail.buildingWhich = targets[0].id;
                }
            } else {
                // 去建造
                const buildingTarget = Game.getObjectById(creep.memory.builderDetail.buildingWhich);
                if (!buildingTarget) {
                    creep.memory.builderDetail.buildingWhich = null;
                } else if (creep.build(buildingTarget) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(buildingTarget, {
                        visualizePathStyle: { stroke: "#ffffff" },
                    });
                }
                // 建造完成了的话
                if (
                    Game.getObjectById(creep.memory.builderDetail.buildingWhich)?.progress ==
                    Game.getObjectById(creep.memory.builderDetail.buildingWhich)?.progressTotal
                ) {
                    creep.say("Done");
                    creep.memory.builderDetail.buildingWhich = null;
                }
            }
        },
        body: {
            basic: [MOVE],
            prefer: [WORK, CARRY],
            want: [WORK],
        },
        priority: (roomName) => {
            let basePriority = 5;
            const creepNum = Memory.creepNumEachRoomEachType[roomName];
            if (Game.rooms[roomName].controller.level == 1) basePriority = 0;
            return basePriority;
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
            if (creep.memory.claimerDetail.claiming) {
                if (creep.claimController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(creep.room.controller);
                }
            } else {
                getEnergyFromStructure(creep);
            }
        },
        body: {
            basic: [],
            prefer: [],
            want: [],
        },
        priority: (roomName) => {
            let basePriority = 1;

            return basePriority;
        },
    },
    [CreepRole.REPAIRER]: {
        name: "Repairer",
        limitAmount: (roomName: string) => {
            return 2;
        },
        extraMemory: (spawn) => {
            return {
                repairerDetail: {
                    repairingWhich: null,
                },
            };
        },
        work: (creep: Creep) => {
            // 没有能量的时候，就去收集能量
            if (creep.store.getUsedCapacity() < 100) {
                if (creep.memory.repairerDetail.repairingWhich == null) creep.moveTo(Game.flags["Flag1"]);
                creepTakeEnergy(creep);
            } else {
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
                            // 选择血量百分比最少的
                            if (target.hits / target.hitsMax < minHitsRatio) {
                                creep.memory.repairerDetail.repairingWhich = target.id;
                                minHitsRatio = target.hits / target.hitsMax;
                            }
                        });
                    } else {
                        creep.memory.repairerDetail.repairingWhich = null;
                    }
                } else {
                    // 知道要修什么的话
                    if (creep.repair(repairTarget) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(repairTarget, {
                            visualizePathStyle: { stroke: "#ffffff" },
                        });
                    }
                    // 如果修好了的话，换目标
                    if (repairTarget.hits == repairTarget.hitsMax) {
                        creep.say("Find newer");
                        creep.memory.repairerDetail.repairingWhich = null;
                    }
                }
            }
        },
        body: {
            basic: [],
            prefer: [WORK, CARRY, MOVE],
            want: [MOVE],
        },
        priority: (roomName) => {
            let basePriority = 6;
            const creepNum = Memory.creepNumEachRoomEachType[roomName];
            if (creepNum[CreepRole.REPAIRER] < 1) {
                basePriority *= 100;
            }
            return basePriority;
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
            var enemy = creep.room.find(FIND_HOSTILE_CREEPS);
            if (enemy.length > 0) {
                if (creep.attack(enemy[0]) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(enemy[0]);
                }
            } else {
                creep.moveTo(Game.flags.Flag1);
            }
        },
        body: {
            basic: [],
            prefer: [ATTACK, MOVE],
            want: [MOVE],
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
            return 8;
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
            /**
             * 对一个creep设置为不工作，且执行他的回调，清楚标记
             * @param creep 对一个creep设置为结束工作
             */
            function finishTransferWork(creep: Creep) {
                creep.memory.transferDetail.working = false;
                creep.memory.transferDetail.arriveFrom = false;
                // 任务完成，执行回调
                callbacks[creep.memory.transferDetail.callback](...creep.memory.transferDetail.callbackParams);
            }

            // 正在孵化的话，不做任何事情
            if (creep.spawning == true) {
                return;
            }

            if (Memory.transferMaximum == null) Memory.transferMaximum = creep.store.getCapacity();
            else Memory.transferMaximum = Math.max(Memory.transferMaximum, creep.store.getCapacity());

            // 如果不在工作阶段，即为准备阶段
            if (!creep.memory.transferDetail.working) {
                // 如果自己还有能量，就需要先把能量放走
                if (
                    creep.store.getUsedCapacity() != 0
                    // 如果队列里没有任务了或者任务少，就去放能量，
                    // 否则直接去干下一个（不过感觉这个优化会导致地上掉落的资源越来越多，导致队列越来越长）
                    //  && (Memory.transferQueue == null || Memory.transferQueue.length <= 1)
                ) {
                    // 去放能量的地方放能量
                    if (creep.memory.transferDetail.storeStructureBeforeWorking != null) {
                        const container = Game.getObjectById(creep.memory.transferDetail.storeStructureBeforeWorking);
                        // 如果目标容器能量满了，那就换一个容器
                        if (!container || container.store.getFreeCapacity(creep.memory.transferDetail.task.resourceType) == 0) {
                            creep.memory.transferDetail.storeStructureBeforeWorking = null;
                            return;
                        }
                        if (creep.transfer(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                            creep.say("Saving");
                            creep.moveTo(container);
                        } else {
                            creep.memory.transferDetail.storeStructureBeforeWorking = null;
                        }
                    } else {
                        // 不知道能量放到哪的时候，去找一个地方放能量
                        const container = findTheNearestContainerWithCapacity(creep);
                        if (container != null) {
                            creep.memory.transferDetail.storeStructureBeforeWorking = container.id;
                        } else {
                            // 没有地方放的话，随机找一个升级者或者建筑工放(这个要随机不然老是卡在一个人那里把路堵死)
                            const tmpContainer = creep.room.find(FIND_MY_CREEPS, {
                                filter: (creep) =>
                                    creep.store.getUsedCapacity() > 0 &&
                                    (creep.memory.role == CreepRole.UPGRADER || creep.memory.role == CreepRole.BUILDER),
                            });
                            if (tmpContainer.length > 0) {
                                // 找到了
                                creep.memory.transferDetail.storeStructureBeforeWorking = tmpContainer[Game.time % tmpContainer.length].id;
                            } else {
                                // 没找到
                                creep.memory.transferDetail.storeStructureBeforeWorking = null;
                            }
                        }
                    }
                } else {
                    // 没有transfer列表的话就直接退出就好
                    if (Memory.transferQueue == null) return;

                    // 选择一份最近的任务
                    const creepCarry = creep.store.getFreeCapacity(RESOURCE_ENERGY);
                    let minMessageIndex = 0;
                    let minRange: number = 9999999999999;
                    for (let i = 0; i < Memory.transferQueue.length; i++) {
                        const message = Memory.transferQueue[i];
                        const toObj = Game.getObjectById(message.to);
                        // 判断任务是否还有效，因为比如墓碑或者creep被干掉了，那这个任务就是无效的
                        if (toObj == null) {
                            Memory.transferQueue.splice(i, 1);
                            // 执行回调，清除掉标记
                            callbacks[message.callback](...message.callbackParams);
                            i--;
                        } else {
                            let fromObj = Game.getObjectById(message.from);
                            // 判断是否from没了，没了就换个from
                            if (fromObj == null) {
                                fromObj = findTheNearestContainerWithEnergy(toObj);
                                if (fromObj) Memory.transferQueue[i].from = fromObj.id;
                            }

                            //   选择一个离creep最近的任务
                            if (fromObj && creepCarry >= message.amount && fromObj.room == creep.room) {
                                const fromPos = fromObj.pos;
                                if (creep.pos.getRangeTo(fromPos) < minRange) {
                                    minRange = creep.pos.getRangeTo(fromPos);
                                    minMessageIndex = i;
                                }
                            }
                        }
                    }
                    // 有可能经过上面的删除后，队列没有元素了，得直接推出
                    if (Memory.transferQueue.length == 0) return;

                    const message = Memory.transferQueue[minMessageIndex];
                    // 队列里删掉这个任务
                    const taskFrom = Game.getObjectById(message.from);
                    const taskTo = Game.getObjectById(message.to);
                    console.log(`${creep.name} 接取任务 从 ${taskFrom} 到 ${taskTo}`);
                    creep.say("Get!");
                    creep.memory.transferDetail.callback = message.callback;
                    creep.memory.transferDetail.callbackParams = message.callbackParams;
                    creep.memory.transferDetail.task = message;
                    creep.memory.transferDetail.arriveFrom = false;
                    creep.memory.transferDetail.working = true;
                    // 下面这个不用清掉回调，后面完成任务会清掉
                    Memory.transferQueue.splice(minMessageIndex, 1);
                }
            }
            // 如果在工作阶段，即为运输阶段
            else {
                creep.say("Working");
                const transferDetail = creep.memory.transferDetail;

                // 去from工作
                if (!creep.memory.transferDetail.arriveFrom) {
                    const from = Game.getObjectById(transferDetail.task.from);

                    // from已经没了，那就换一个from
                    if (
                        from == null ||
                        // from能量不够 那就去换一个from
                        (from instanceof Resource && (from.amount == 0 || from.amount == undefined))
                    ) {
                        const newFrom = findTheNearestContainerWithEnergy(creep, transferDetail.task.amount);
                        if (newFrom == null) {
                            console.log(
                                `${creep.name} <div style="color:red;">放弃任务, 能量保留到transfer里</div> 原因: 找不到合适的from`
                            );
                            creep.say("Give up");
                            finishTransferWork(creep);
                            return;
                        }
                        transferDetail.task.from = newFrom.id;
                    }

                    // 在源点要使用pickup方法时
                    if (creep.memory.transferDetail.task.fromTaskType == FromTaskType.pickup) {
                        const fromTarget = Game.getObjectById(creep.memory.transferDetail.task.from);
                        if (creep.pickup(<Resource<ResourceConstant>>fromTarget) == ERR_NOT_IN_RANGE) {
                            creep.moveTo(fromTarget);
                        } else {
                            creep.memory.transferDetail.arriveFrom = true;
                        }
                    }
                    // 在源点要使用withdraw方法时
                    if (creep.memory.transferDetail.task.fromTaskType == FromTaskType.withdraw) {
                        const fromTarget = Game.getObjectById(creep.memory.transferDetail.task.from);
                        if (creep.withdraw(<Structure<StructureConstant> | Tombstone | Ruin>fromTarget, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                            creep.moveTo(fromTarget);
                        } else {
                            creep.memory.transferDetail.arriveFrom = true;
                        }
                    }
                } else {
                    // 去to工作
                    const to = Game.getObjectById(creep.memory.transferDetail.task.to);
                    if (to == null || to.store.getFreeCapacity(creep.memory.transferDetail.task.resourceType) == 0) {
                        console.log(
                            `${creep.name} <div style="color:red;">放弃, 能量保留在transfer里</div> 原因: to: ${to} 已经没有空间了`
                        );
                        creep.say("Give up");
                        finishTransferWork(creep);
                        return;
                    }

                    if (creep.memory.transferDetail.task.toTaskType == ToTaskType.transfer) {
                        const transferResult = creep.transfer(to, RESOURCE_ENERGY);
                        if (
                            (transferResult == ERR_NOT_IN_RANGE ||
                                // 或者孵化中的creep
                                transferResult == ERR_BUSY) &&
                            to.store.getFreeCapacity(creep.memory.transferDetail.task.resourceType) > 0
                        ) {
                            creep.moveTo(to);
                        } else if (transferResult == OK) {
                            // transfer finished
                            if (creep.memory.transferDetail.working) {
                                creep.say("Done");
                                const doneFrom = Game.getObjectById(creep.memory.transferDetail.task.from);
                                const doneTo = Game.getObjectById(creep.memory.transferDetail.task.to);
                                console.log(
                                    `${creep.name} 完成任务 从 ${doneFrom} 到 ${doneTo}`
                                );
                                finishTransferWork(creep);
                            }
                        } else {
                            console.log(
                                `<div style="color: red;"> ${creep.name} 发生错误: ${transferResult}</div> 原因: ${JSON.stringify(
                                    creep.memory.transferDetail.task
                                )}`
                            );
                        }
                    }
                }
            }
        },
        body: {
            basic: [],
            prefer: [CARRY, MOVE],
            want: [MOVE],
        },
        priority: (roomName) => {
            let basePriority = 8;
            const creepNum = Memory.creepNumEachRoomEachType[roomName];
            if (creepNum[CreepRole.TRANSFER] <= 4) {
                basePriority *= 100;
            }

            return basePriority;
        },
    },
};
