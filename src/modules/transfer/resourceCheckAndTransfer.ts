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
            const carryAmount = Memory.transferMaximum || 100;
            // 按实际需要搬运的次数计算任务数
            const taskCount = Math.ceil(resource.amount / carryAmount);
            for (let i = 0; i < taskCount; i++) {
                if (getMark(resource.id, `transfer${i}`)) continue;
                const nearest = findTheNearestContainerWithCapacity(resource);
                // 如果所有的容器都没能力接受这个资源，那就退出
                if (!nearest) return;
                setMark(resource.id, `transfer${i}`, true);
                // 每个任务只搬运carryAmount，最后一个任务搬运剩余量
                const amount = Math.min(resource.amount - i * carryAmount, carryAmount);
                transferQueue.addMessage(
                    resource,
                    nearest,
                    FromTaskType.pickup,
                    ToTaskType.transfer,
                    amount,
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
                nearest,
                FromTaskType.withdraw,
                ToTaskType.transfer,
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
