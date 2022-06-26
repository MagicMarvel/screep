import transferQueue, { FromTaskType, ToTaskType } from "../transfer/transferQueue";
import { findTheNearestContainerWithCapacity } from "../utils/findTheNearestContainer";
import { deleteMark, getMark, setMark } from "../utils/markController";

export function dismark() {}

/**
 * 这个函数用于检查地上的资源并转移到最近的容器中
 */
export const resourceCheckAndTransfer = () => {
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        // 过滤出所有没有mark的资源
        const resources = room.find(FIND_DROPPED_RESOURCES, {
            filter: (resource) => {
                return resource.amount > 100 && getMark(resource.id, "transfer") == null;
            },
        });
        // 向transfer消息队列发送消息并mark资源
        resources.forEach((resource) => {
            setMark(resource.id, "transfer", true);

            transferQueue.addMessage(
                resource,
                findTheNearestContainerWithCapacity(resource),
                FromTaskType.pickup,
                ToTaskType.transfer,
                // 为了避免添加任务的时候还没有任何一个transferer，导致下面这个没有值，我们默认给一个100即可
                Memory.transferMaximum || 100,
                0,
                RESOURCE_ENERGY,
                // 任务完成取消掉mark
                () => {
                    console.log("resourceCheckAndTransfer: remove mark");
                    deleteMark(resource.id, "transfer");
                }
            );
            console.log(`resourceCheckAndTransfer: ${Memory.transferQueue[0].callback.toString()}`);
        });
    }
};
