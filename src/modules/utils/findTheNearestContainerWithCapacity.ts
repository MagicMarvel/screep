/**
 * 返回离这个对象最近的可以存放资源的容器，可能为null，优先extension和spawn
 * @param somtThing 任意的包含room和position的对象
 * @returns 离这个对象最近的可以存放资源的容器
 */
export function findTheNearestContainerWithCapacity<
    T extends {
        room: Room;
        pos: RoomPosition;
    }
>(somtThing: T): StructureContainer | StructureExtension | StructureSpawn {
    // console.log(`findTheNearestContainerWithCapacity: ${Game.spawns["Spawn1"].structureType}`);
    const containers = somtThing.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
            if (structure.structureType == STRUCTURE_SPAWN) {
                // console.log(
                //     `findTheNearestContainerWithCapacity: structure: ${structure} ${
                //         structure.structureType
                //     } ${structure.store.getFreeCapacity(RESOURCE_ENERGY)}`
                // );
            }
            return (
                (structure.structureType == STRUCTURE_CONTAINER ||
                    structure.structureType == STRUCTURE_EXTENSION ||
                    structure.structureType == STRUCTURE_SPAWN) &&
                structure.store.getFreeCapacity(RESOURCE_ENERGY) >= 1
            );
        },
    }) as (StructureContainer | StructureExtension | StructureSpawn | null)[];
    // console.log(`findTheNearestContainerWithCapacity: containers: ${JSON.stringify(containers)}`);

    let nearest: StructureContainer | StructureExtension | StructureSpawn | null = null,
        nearestDistance = 999999999;
    containers.forEach((container) => {
        let distance =
            (container.pos.x - somtThing.pos.x) * (container.pos.x - somtThing.pos.x) +
            (container.pos.y - somtThing.pos.y) * (container.pos.y - somtThing.pos.y);
        // 同时有container和extension优先放置extension和spawn
        if (container.structureType == STRUCTURE_SPAWN || container.structureType == STRUCTURE_EXTENSION) {
            distance = distance / 3;
        }
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearest = container;
        }
    });

    // console.log(`findTheNearestContainerWithCapacity: ${containers}`);
    return nearest;
}
