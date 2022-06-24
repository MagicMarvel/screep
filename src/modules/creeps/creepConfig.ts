import { sortBy, sortByOrder } from "lodash";
import getEnergyFromStructure from "../utils/getEnergyFromStructure";
import { CreepRole } from "./declareCreepRoleEnum";
import { findTheNearestContainerWithCapacity } from "../utils/findTheNearestContainer";
import { TransferQueueItem, FromTaskType, ToTaskType } from "../transfer/transferQueue";

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
            return 2;
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
                if (harvestingEachSourceCreepNum[name] < 1) {
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
                    console.log(sourceID);

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
            console.log(basePriority);

            return basePriority;
        },
    },
    [CreepRole.UPGRADER]: {
        name: "Upgrader",
        limitAmount: (roomName: string) => {
            return 4;
        },
        extraMemory: (spawn) => {
            return {
                upgradeDetail: { upgrading: false },
            };
        },
        work: function (creep: Creep) {
            // 如果这个creep没有能量的话，就去收集能量
            if (creep.memory.upgradeDetail.upgrading && creep.store[RESOURCE_ENERGY] == 0) {
                creep.memory.upgradeDetail.upgrading = false;
                creep.say("🔄 harvest");
            }
            if (!creep.memory.upgradeDetail.upgrading && creep.store.getFreeCapacity() == 0) {
                creep.memory.upgradeDetail.upgrading = true;
                creep.say("🚧 upgrade");
            }
            if (!creep.memory.upgradeDetail.upgrading) {
                getEnergyFromStructure(creep);
            } else {
                if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(creep.room.controller);
                }
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
            if (creepNum[CreepRole.UPGRADER] <= 1) {
                basePriority *= 100;
            }
            return basePriority;
        },
    },
    [CreepRole.BUILDER]: {
        name: "Builder",
        limitAmount: (roomName: string) => {
            return 2;
        },
        extraMemory: (spawn) => {
            return {
                builderDetail: {
                    building: false,
                },
            };
        },
        work: (creep: Creep) => {
            if (creep.memory.builderDetail.building && creep.store[RESOURCE_ENERGY] == 0) {
                creep.memory.builderDetail.building = false;
                creep.say("🔄 harvest");
            }
            if (!creep.memory.builderDetail.building && creep.store.getFreeCapacity() == 0) {
                creep.memory.builderDetail.building = true;
                creep.say("🚧 build");
            }

            if (creep.memory.builderDetail.building) {
                var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
                if (targets.length) {
                    if (creep.build(targets[parseInt(creep.name.slice(8, 10)) % 2]) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(targets[parseInt(creep.name.slice(8, 10)) % 2], {
                            visualizePathStyle: { stroke: "#ffffff" },
                        });
                    }
                }
            } else {
                getEnergyFromStructure(creep);
            }
        },
        body: {
            basic: [],
            perfer: [WORK, CARRY, MOVE],
            want: [MOVE],
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
            return 3;
        },
        extraMemory: (spawn) => {
            return {
                repairerDetail: {
                    repairing: false,
                },
            };
        },
        work: (creep: Creep) => {
            if (creep.memory.repairerDetail.repairing && creep.store[RESOURCE_ENERGY] == 0) {
                creep.memory.repairerDetail.repairing = false;
                creep.say("🔄 adding energy");
            }

            // 拿完能量了后，就去修理
            if (!creep.memory.repairerDetail.repairing && creep.store.getFreeCapacity() == 0) {
                creep.memory.repairerDetail.repairing = true;
                creep.say("🚧 repairing");
            }

            if (creep.memory.repairerDetail.repairing) {
                var targets = creep.room.find(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (
                            // (structure.structureType == STRUCTURE_ROAD ||
                            //   structure.structureType == STRUCTURE_CONTAINER ||
                            //   structure.structureType == STRUCTURE_RAMPART ||
                            //   structure.structureType == STRUCTURE_WALL) &&
                            // structure.hits < structure.hitsMax &&
                            // structure.room === creep.room

                            structure.structureType == STRUCTURE_CONTAINER &&
                            structure.hits < structure.hitsMax &&
                            structure.room === creep.room
                        );
                    },
                });

                targets = sortBy(targets, (t) => t.hits);

                if (targets.length) {
                    const building = targets[0];
                    if (creep.repair(building) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(building, {
                            visualizePathStyle: { stroke: "#ffffff" },
                        });
                    }
                }
            } else {
                // 拿能量
                getEnergyFromStructure(creep);
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
            if (creepNum[CreepRole.REPAIRER] <= 3) {
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
            return 4;
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
        work: (creep: Creep) => {
            if (Memory.transferMaximum == null) Memory.transferMaximum = creep.store.getCapacity();
            else Math.max(Memory.transferMaximum, creep.store.getCapacity());

            // 如果不在工作阶段，即为准备阶段
            if (!creep.memory.transferDetail.working) {
                // 如果自己还有能量，就需要先把能量放走
                if (creep.store.getUsedCapacity() != 0) {
                    // 去放能量的地方放能量
                    if (creep.memory.transferDetail.storeStructureBeforeWorking != null) {
                        const container = creep.memory.transferDetail.storeStructureBeforeWorking;
                        if (creep.transfer(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                            creep.moveTo(container);
                        } else {
                            creep.memory.transferDetail.storeStructureBeforeWorking = null;
                        }
                    }
                    // 不知道能量放到哪的时候，去找一个地方放能量
                    else creep.memory.transferDetail.storeStructureBeforeWorking = findTheNearestContainerWithCapacity(creep);
                } else {
                    // 选择一份任务

                    const creepCarry = creep.store.getFreeCapacity();

                    for (let i = 0; i < Memory.transferQueue.length; i++) {
                        const message = Memory.transferQueue[i];
                        if (creepCarry >= message.amount && Game.getObjectById(message.from).room == creep.room) {
                            creep.memory.transferDetail.task = message;
                            creep.memory.transferDetail.arriveFrom = false;
                            creep.memory.transferDetail.working = true;
                            // 队列里删掉这个任务
                            Memory.transferQueue.splice(i, 1);
                            return;
                        }
                    }
                }
            }
            // 如果在工作阶段，即为运输阶段
            else {
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
                            creep.memory.transferDetail.working = false;
                            creep.memory.transferDetail.arriveFrom = false;
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
