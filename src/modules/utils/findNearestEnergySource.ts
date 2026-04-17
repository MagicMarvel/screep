/**
 * 返回离这个对象最近的有能量的容器或者掉地上的能量也行，可能为null
 * @param origin 任意的包含room和position的对象
 * @param amount 至少要的资源量，可以为空
 * @returns 离这个对象最近的可以拿能量的容器
 */
export function findNearestEnergySource<
    T extends {
        room: Room;
        pos: RoomPosition;
    }
>(origin: T, amount?: number): StructureContainer | Resource<ResourceConstant> | Tombstone | Ruin | StructureStorage | null {
    let nearest: StructureContainer | Resource<ResourceConstant> | Tombstone | Ruin | StructureStorage | null = null,
        nearestDistance = Infinity;

    // 寻找容器
    let containers = origin.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
            return structure.structureType == STRUCTURE_CONTAINER && structure.store.getUsedCapacity(RESOURCE_ENERGY) >= (amount || 100);
        },
    }) as (StructureContainer | null)[];
    if (containers.length != 0)
        containers.forEach((container) => {
            const distance =
                (container.pos.x - origin.pos.x) * (container.pos.x - origin.pos.x) +
                (container.pos.y - origin.pos.y) * (container.pos.y - origin.pos.y);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = container;
            }
        });

    // 寻找掉地上的能量
    const droppedEnergy = origin.room.find(FIND_DROPPED_RESOURCES, {
        filter: (resource) => resource.resourceType == RESOURCE_ENERGY && resource.amount >= (amount || 100),
    });
    if (droppedEnergy.length != 0) {
        droppedEnergy.forEach((energy) => {
            const distance =
                (energy.pos.x - origin.pos.x) * (energy.pos.x - origin.pos.x) +
                (energy.pos.y - origin.pos.y) * (energy.pos.y - origin.pos.y);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = energy;
            }
        });
    }

    return nearest;
}
