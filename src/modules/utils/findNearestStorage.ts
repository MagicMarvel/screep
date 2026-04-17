/**
 * 返回离这个对象最近的可以存放资源的容器，可能为null，优先extension和spawn，其次container
 * @param origin 任意的包含room和position的对象
 * @returns 离这个对象最近的可以存放资源的容器
 */
export function findNearestStorage<
    T extends {
        room: Room;
        pos: RoomPosition;
    }
>(origin: T): StructureContainer | StructureExtension | StructureSpawn | null {
    // 优先找 extension 和 spawn
    const extensionsAndSpawns = origin.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
            return (
                (structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_SPAWN) &&
                structure.store.getFreeCapacity(RESOURCE_ENERGY) >= 1
            );
        },
    }) as (StructureExtension | StructureSpawn)[];

    if (extensionsAndSpawns.length > 0) {
        let nearest: StructureExtension | StructureSpawn | null = null;
        let nearestDistance = Infinity;
        extensionsAndSpawns.forEach((structure) => {
            const distance =
                (structure.pos.x - origin.pos.x) ** 2 +
                (structure.pos.y - origin.pos.y) ** 2;
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = structure;
            }
        });
        return nearest;
    }

    // 找不到 extension/spawn，再找 container
    const containers = origin.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
            return (
                structure.structureType == STRUCTURE_CONTAINER &&
                structure.store.getFreeCapacity(RESOURCE_ENERGY) >= 1
            );
        },
    }) as StructureContainer[];

    if (containers.length > 0) {
        let nearest: StructureContainer | null = null;
        let nearestDistance = Infinity;
        containers.forEach((container) => {
            const distance =
                (container.pos.x - origin.pos.x) ** 2 +
                (container.pos.y - origin.pos.y) ** 2;
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = container;
            }
        });
        return nearest;
    }

    return null;
}
