import transferQueue, { FromTaskType, ToTaskType } from "../transfer/transferQueue";
import { findTheNearestContainerWithCapacity } from "../utils/findTheNearestContainerWithCapacity";
import { deleteMark, getMark, setMark } from "../utils/markController";
import { DELETE_MARK } from "../callback/index";
/**
 * 这个函数用于检查地上的资源并转移到最近的容器中
 */
export const resourceCheckAndTransfer = () => {
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];

        // 检查有无地上掉落的资源
        const droppedResourcesResources = room.find(FIND_DROPPED_RESOURCES, {
            filter: (resource) => {
                // 过滤出所有资源
                return resource.amount > 200;
            },
        });

        // 向transfer消息队列发送消息并mark资源
        droppedResourcesResources.forEach((resource) => {
            // 要拿多少次发多少次消息
            for (let i = 0; i < resource.amount / (Memory.transferMaximum || 100); i++) {
                const nearest = findTheNearestContainerWithCapacity(resource);
                // 如果所有的容器都没能力接受这个资源，那就退出
                if (!nearest) return;
                if (getMark(resource.id, `transfer${i}`)) continue;
                setMark(resource.id, `transfer${i}`, true);
                transferQueue.addMessage(
                    resource,
                    findTheNearestContainerWithCapacity(resource),
                    FromTaskType.pickup,
                    ToTaskType.transfer,
                    // 为了避免添加任务的时候还没有任何一个transferer，导致下面这个没有值，我们默认给一个100即可
                    Math.min(resource.amount, Memory.transferMaximum || 100),
                    1,
                    RESOURCE_ENERGY,
                    // 任务完成取消掉mark
                    DELETE_MARK,
                    resource.id,
                    `transfer${i}`
                );
            }
        });

        // 检查有无墓碑
        const tombstoneResources = room.find(FIND_TOMBSTONES, {
            filter: (tombstone) => {
                return getMark(tombstone.id, "transfer") == null;
            },
        });
        // 向transfer消息队列发送消息并mark资源
        tombstoneResources.forEach((resource) => {
            const nearest = findTheNearestContainerWithCapacity(resource);
            // 如果所有的容器都没能力接受这个资源，那就退出
            if (!nearest) return;
            setMark(resource.id, "transfer", true);
            transferQueue.addMessage(
                resource,
                findTheNearestContainerWithCapacity(resource),
                FromTaskType.withdraw,
                ToTaskType.transfer,
                // 为了避免添加任务的时候还没有任何一个transferer，导致下面这个没有值，我们默认给一个100即可
                Math.min(resource.store.getUsedCapacity(RESOURCE_ENERGY), Memory.transferMaximum || 100),
                0,
                RESOURCE_ENERGY,
                // 任务完成取消掉mark
                DELETE_MARK,
                resource.id,
                "transfer"
            );
        });
    }
};
