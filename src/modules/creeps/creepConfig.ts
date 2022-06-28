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
            perfer: BodyPartConstant[];
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
            let harvestingEachSourceCreepNum: {
                [sourceId: Id<Source>]: number;
            } = {};
            for (const name in Game.creeps) {
                const creep = Game.creeps[name];
                if (creep.memory.role == CreepRole.HARVESTER) {
                    if (harvestingEachSourceCreepNum[creep.memory.harvesterDetail.harvesterWhich] == null) {
                        harvestingEachSourceCreepNum[creep.memory.harvesterDetail.harvesterWhich] = 1;
                    } else {
                        harvestingEachSourceCreepNum[creep.memory.harvesterDetail.harvesterWhich]++;
                    }
                }
            }

            // 如果有一个source的harvester没有到达上限，则在这里创建一个新的harvester
            for (const name in harvestingEachSourceCreepNum) {
                if (harvestingEachSourceCreepNum[name] < 2) {
                    return {
                        harvesterDetail: {
                            harvesterWhich: name as Id<Source>,
                        },
                    };
                }
            }

            // 如果有source没有harvester，则在这里创建一个新的harvester
            const sources = spawn.room.find(FIND_SOURCES);
            for (let i = 0; i < sources.length; i++) {
                const source = sources[i];
                const sourceID = source.id;
                if (harvestingEachSourceCreepNum[sourceID] == null) {
                    return {
                        harvesterDetail: {
                            harvesterWhich: sourceID,
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
            perfer: [WORK],
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
        work: function (creep: Creep) {
            // 如果这个creep没有能量的话，就去收集能量
            if (creep.store.getUsedCapacity() < 100) {
                creepTakeEnergy(creep, 0);
            }

            if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller);
            }
        },
        body: {
            basic: [MOVE],
            perfer: [WORK, CARRY],
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
            return 3;
        },
        extraMemory: (spawn) => {
            return {
                builderDetail: {
                    buildingWhich: null,
                },
            };
        },
        work: (creep: Creep) => {
            // 没有决定要建造哪一个建筑且没有能量的时候，就去呆着，不要堵路，决定好了建造那个的话就呆在要建造的东西的旁边
            if (creep.store.getUsedCapacity() < 100) {
                if (creep.memory.builderDetail.buildingWhich == null) creep.moveTo(Game.flags["Flag1"]);
                creepTakeEnergy(creep);
            }

            if (creep.memory.builderDetail.buildingWhich == null || Game.getObjectById(creep.memory.builderDetail.buildingWhich) == null) {
                // 选择一个可建的去建造
                var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
                if (targets.length) {
                    creep.memory.builderDetail.buildingWhich = targets[0].id;
                }
            } else {
                // 去建造
                if (creep.build(Game.getObjectById(creep.memory.builderDetail.buildingWhich)) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(Game.getObjectById(creep.memory.builderDetail.buildingWhich), {
                        visualizePathStyle: { stroke: "#ffffff" },
                    });
                }
                // 建造完成了的话
                if (
                    Game.getObjectById(creep.memory.builderDetail.buildingWhich).progress ==
                    Game.getObjectById(creep.memory.builderDetail.buildingWhich).progressTotal
                ) {
                    creep.say("Done");
                    creep.memory.builderDetail.buildingWhich = null;
                }
            }
        },
        body: {
            basic: [MOVE],
            perfer: [WORK, CARRY],
            want: [WORK],
        },
        priority: (roomName) => {
            let basePriority = 5;
            const creepNum = Memory.creepNumEachRoomEachType[roomName];

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
            perfer: [],
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
            // 没有决定要建造哪一个建筑且没有能量的时候，就去呆着，不要堵路，决定好了建造那个的话就呆在要建造的东西的旁边
            if (creep.store.getUsedCapacity() < 100) {
                if (creep.memory.repairerDetail.repairingWhich == null) creep.moveTo(Game.flags["Flag1"]);
                creepTakeEnergy(creep);
            }

            //
            if (
                creep.memory.repairerDetail.repairingWhich == null ||
                Game.getObjectById(creep.memory.repairerDetail.repairingWhich) == null
            ) {
                // 不知道要修啥的话，选择一个可修的去修
                var targets = creep.room.find(FIND_STRUCTURES, {
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
                    let repairingWhichHits = 1;
                    targets.forEach((target) => {
                        // 选择血量百分比最少的
                        if (target.hits / target.hitsMax < repairingWhichHits) {
                            creep.memory.repairerDetail.repairingWhich = target.id;
                            repairingWhichHits = target.hits / target.hitsMax;
                        }
                    });
                }
            } else {
                // 知道要修什么的话
                const repairResult = creep.repair(Game.getObjectById(creep.memory.repairerDetail.repairingWhich));
                const repairingWhich = Game.getObjectById(creep.memory.repairerDetail.repairingWhich);
                if (repairResult == ERR_NOT_IN_RANGE) {
                    creep.moveTo(Game.getObjectById(creep.memory.repairerDetail.repairingWhich), {
                        visualizePathStyle: { stroke: "#ffffff" },
                    });
                }
                // 如果修好了的话，换目标
                if (repairingWhich.hits == repairingWhich.hitsMax) {
                    creep.say("Find newer");
                    creep.memory.repairerDetail.repairingWhich = null;
                }
            }
        },
        body: {
            basic: [],
            perfer: [WORK, CARRY, MOVE],
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
            perfer: [ATTACK, MOVE],
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
            if (Memory.transferMaximum == null) Memory.transferMaximum = creep.store.getCapacity();
            else Memory.transferMaximum = Math.max(Memory.transferMaximum, creep.store.getCapacity());

            // 如果不在工作阶段，即为准备阶段
            if (!creep.memory.transferDetail.working) {
                // 如果自己还有能量，就需要先把能量放走
                if (creep.store.getUsedCapacity() != 0) {
                    // 去放能量的地方放能量
                    if (creep.memory.transferDetail.storeStructureBeforeWorking != null) {
                        const container = Game.getObjectById(creep.memory.transferDetail.storeStructureBeforeWorking);
                        // 如果目标容器能量满了，那就换一个容器
                        if (!container || container.store.getFreeCapacity() == 0) {
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
                    if (!Memory.transferQueue) return;

                    // 选择一份最近的任务
                    const creepCarry = creep.store.getFreeCapacity();
                    let minMessageIndex = 0;
                    let minRange: number = 9999999999999;
                    for (let i = 0; i < Memory.transferQueue.length; i++) {
                        const message = Memory.transferQueue[i];
                        // 判断任务是否还有效，因为比如墓碑或者creep被干掉了，那这个任务就是无效的
                        if (Game.getObjectById(message.to) == null) {
                            Memory.transferQueue.splice(i, 1);
                            i--;
                        } else {
                            // 判断是否from没了，没了就换个from
                            if (Game.getObjectById(message.from) == null) {
                                Memory.transferQueue[i].from = findTheNearestContainerWithEnergy(Game.getObjectById(message.to)).id;
                            }

                            //   选择一个离creep最近的任务
                            if (creepCarry >= message.amount && Game.getObjectById(message.from).room == creep.room) {
                                const fromPos = Game.getObjectById(message.from).pos;
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
                    console.log(`${creep.name} 接取任务 从 ${Game.getObjectById(message.from)} 到 ${Game.getObjectById(message.to)}`);
                    creep.say("Get!");
                    creep.memory.transferDetail.callback = message.callback;
                    creep.memory.transferDetail.callbackParams = message.callbackParams;
                    creep.memory.transferDetail.task = message;
                    creep.memory.transferDetail.arriveFrom = false;
                    creep.memory.transferDetail.working = true;
                    Memory.transferQueue.splice(minMessageIndex, 1);
                }
            }
            // 如果在工作阶段，即为运输阶段
            else {
                creep.say("Working");
                // 去from工作
                if (!creep.memory.transferDetail.arriveFrom) {
                    // 在源点要使用pickup方法时
                    if (creep.memory.transferDetail.task.fromTaskType == FromTaskType.pickup) {
                        const to = Game.getObjectById(creep.memory.transferDetail.task.from);
                        if (creep.pickup(<Resource<ResourceConstant>>to) == ERR_NOT_IN_RANGE) {
                            creep.moveTo(to);
                        } else {
                            creep.memory.transferDetail.arriveFrom = true;
                        }
                    }
                    // 在源点要使用withdraw方法时
                    if (creep.memory.transferDetail.task.fromTaskType == FromTaskType.withdraw) {
                        const to = Game.getObjectById(creep.memory.transferDetail.task.from);
                        if (creep.withdraw(<Structure<StructureConstant> | Tombstone | Ruin>to, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                            creep.moveTo(to);
                        } else {
                            creep.memory.transferDetail.arriveFrom = true;
                        }
                    }
                } else {
                    // 去to工作
                    if (creep.memory.transferDetail.task.toTaskType == ToTaskType.transfer) {
                        const to = Game.getObjectById(creep.memory.transferDetail.task.to);
                        if (creep.transfer(to, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                            creep.moveTo(to);
                        } else {
                            // transfer finished
                            if (creep.memory.transferDetail.working) {
                                creep.memory.transferDetail.working = false;
                                creep.memory.transferDetail.arriveFrom = false;
                                creep.say("Done");
                                console.log(
                                    `${creep.name} 完成任务 从 ${Game.getObjectById(
                                        creep.memory.transferDetail.task.from
                                    )} 到 ${Game.getObjectById(creep.memory.transferDetail.task.to)}`
                                );

                                // 任务完成，执行回调
                                callbacks[creep.memory.transferDetail.callback](...creep.memory.transferDetail.callbackParams);
                            }
                        }
                    }
                }
            }
        },
        body: {
            basic: [],
            perfer: [CARRY, MOVE],
            want: [MOVE],
        },
        priority: (roomName) => {
            let basePriority = 8;
            const creepNum = Memory.creepNumEachRoomEachType[roomName];
            if (creepNum[CreepRole.TRANSFER] <= 3) {
                basePriority *= 100;
            }

            return basePriority;
        },
    },
};
