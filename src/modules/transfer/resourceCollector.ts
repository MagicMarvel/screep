import transferQueue, { PickupMethod, DeliveryMethod } from "../transfer/transferQueue";
import { findNearestStorage } from "../utils/findNearestStorage";
import { deleteMark, getMark, setMark } from "../utils/markController";
import { DELETE_MARK, DECREMENT_MARK } from "../callback/index";

/**
 * 查找房间内最近的能量源（container/storage）
 */
function findNearestStorageWithEnergy(room: Room): StructureContainer | StructureStorage | null {
    const sources = room.find(FIND_STRUCTURES, {
        filter: (s): s is StructureContainer | StructureStorage =>
            (s.structureType == STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE) &&
            s.store.getUsedCapacity(RESOURCE_ENERGY) >= 100,
    });
    if (sources.length === 0) return null;

    let nearest: StructureContainer | StructureStorage | null = null;
    let minDist = Infinity;
    sources.forEach((s) => {
        // 简单取第一个 spawn 为参考点
        const spawn = room.find(FIND_MY_SPAWNS)[0];
        const dist = spawn ? spawn.pos.getRangeTo(s) : 0;
        if (dist < minDist) {
            minDist = dist;
            nearest = s;
        }
    });
    return nearest;
}

/**
 * 这个函数用于检查地上的资源并转移到最近的容器中，
 * 同时检查 spawn/extension 能量不足时发布最高优先级补给任务
 */
export const resourceCheckAndTransfer = () => {
    const maxCarry = Memory.transferMaximum || 100;

    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];

        // ===== 最高优先级：spawn/extension 能量补给 =====
        const energySource = findNearestStorageWithEnergy(room);
        if (energySource) {
            const emptyStructures = room.find(FIND_MY_STRUCTURES, {
                filter: (s): s is StructureSpawn | StructureExtension =>
                    (s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION) &&
                    s.store.getUsedCapacity(RESOURCE_ENERGY) === 0,
            });
            emptyStructures.forEach((target) => {
                const tag = "refill";
                if (getMark(target.id, tag)) return;
                setMark(target.id, tag, true);
                transferQueue.addTask(
                    energySource,
                    target,
                    PickupMethod.Withdraw,
                    DeliveryMethod.Transfer,
                    target.store.getCapacity(RESOURCE_ENERGY),
                    -1,
                    RESOURCE_ENERGY,
                    DELETE_MARK,
                    target.id,
                    tag
                );
            });
        }

        // ===== 检查地上掉落的资源 =====
        const droppedResources = room.find(FIND_DROPPED_RESOURCES, {
            filter: (resource) => {
                return resource.amount > 50;
            },
        });

        droppedResources.forEach((resource) => {
            const tag = "transfer0";
            const existingTasks = getMark(resource.id, tag);
            const taskCount = existingTasks || 0;
            const remainAfterTasks = resource.amount - taskCount * maxCarry;

            if (remainAfterTasks <= 0) return;

            // 每轮扫描只发1个任务，完成后 DECREMENT_MARK 释放 mark，下轮补发
            const nearest = findNearestStorage(resource);
            if (!nearest) return;

            setMark(resource.id, tag, taskCount + 1);
            transferQueue.addTask(
                resource,
                nearest,
                PickupMethod.Pickup,
                DeliveryMethod.Transfer,
                Math.min(remainAfterTasks, maxCarry),
                1,
                RESOURCE_ENERGY,
                DECREMENT_MARK,
                resource.id,
                tag
            );
        });

        // ===== 检查墓碑 =====
        const tombstoneResources = room.find(FIND_TOMBSTONES, {
            filter: (tombstone) => {
                return getMark(tombstone.id, "transfer") == null;
            },
        });
        tombstoneResources.forEach((resource) => {
            const nearest = findNearestStorage(resource);
            if (!nearest) return;
            setMark(resource.id, "transfer", true);
            transferQueue.addTask(
                resource,
                nearest,
                PickupMethod.Withdraw,
                DeliveryMethod.Transfer,
                Math.min(resource.store.getUsedCapacity(RESOURCE_ENERGY), Memory.transferMaximum || 100),
                0,
                RESOURCE_ENERGY,
                DELETE_MARK,
                resource.id,
                "transfer"
            );
        });
    }
};
