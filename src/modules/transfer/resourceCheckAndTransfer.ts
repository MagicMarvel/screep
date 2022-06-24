import transferQueue, { FromTaskType, ToTaskType } from "../transfer/transferQueue";
import { findTheNearestContainerWithCapacity } from "../utils/findTheNearestContainer";

export const resourceCheckAndTransfer = () => {
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        const resources = room.find(FIND_DROPPED_RESOURCES, {
            filter: (resource) => {
                return resource.amount > 100;
            },
        });
        resources.forEach((resource) => {
            transferQueue.addMessage(
                resource,
                findTheNearestContainerWithCapacity(resource),
                FromTaskType.pickup,
                ToTaskType.transfer,
                Memory.transferMaximum,
                0
            );
        });
    }
};
