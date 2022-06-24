interface haveRoom {
    room: Room;
}
// 寻找最近的可以放的容器
export const findTheNearestContainerWithCapacity = <
    T extends {
        room: Room;
        pos: RoomPosition;
    }
>(
    somtThing: T
) => {
    const containers = somtThing.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
            return (
                (structure.structureType == STRUCTURE_CONTAINER ||
                    structure.structureType == STRUCTURE_EXTENSION ||
                    structure.structureType == STRUCTURE_SPAWN) &&
                structure.store.getFreeCapacity() > 0
            );
        },
    });
    let nearest: AnyStructure,
        nearestDistance = 999999999;
    containers.forEach((container) => {
        const distance =
            (container.pos.x - somtThing.pos.x) * (container.pos.x - somtThing.pos.x) +
            (container.pos.y - somtThing.pos.y) * (container.pos.y - somtThing.pos.y);
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearest = container;
        }
    });
    return nearest;
};
