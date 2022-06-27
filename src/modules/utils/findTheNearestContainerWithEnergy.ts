/**
 * 返回离这个对象最近的有能量的容器或者掉地上的能量也行，优先容器，可能为null
 * @param somtThing 任意的包含room和position的对象
 * @returns 离这个对象最近的可以拿能量的容器
 */
export function findTheNearestContainerWithEnergy<
    T extends {
        room: Room;
        pos: RoomPosition;
    }
>(somtThing: T): StructureContainer | StructureExtension | Resource<ResourceConstant> | null {
    let containers = somtThing.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
            return (
                (structure.structureType == STRUCTURE_CONTAINER || structure.structureType == STRUCTURE_EXTENSION) &&
                structure.store.getUsedCapacity(RESOURCE_ENERGY) > 100
            );
        },
    }) as (StructureContainer | StructureExtension | null)[];

    let nearest: StructureContainer | StructureExtension | Resource<ResourceConstant> | null = null,
        nearestDistance = 999999999;
    // 寻找容器
    if (containers.length != 0)
        containers.forEach((container) => {
            const distance =
                (container.pos.x - somtThing.pos.x) * (container.pos.x - somtThing.pos.x) +
                (container.pos.y - somtThing.pos.y) * (container.pos.y - somtThing.pos.y);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = container;
            }
        });
    else {
        // 寻找掉地上的能量
        const droppedEnergy = somtThing.room.find(FIND_DROPPED_RESOURCES, {
            filter: (resource) => resource.resourceType == RESOURCE_ENERGY,
        });
        if (droppedEnergy.length != 0) {
            droppedEnergy.forEach((energy) => {
                const distance =
                    (energy.pos.x - somtThing.pos.x) * (energy.pos.x - somtThing.pos.x) +
                    (energy.pos.y - somtThing.pos.y) * (energy.pos.y - somtThing.pos.y);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearest = energy;
                }
            });
        }
    }

    return nearest;
}
