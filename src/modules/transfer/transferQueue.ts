/**
 * from: Resource|Structure|Tombstone|Ruin
 * to: RoomPosition|Creep|PowerCreep|Structure
 * fromTaskType: pickup withdraw
 * toTaskType: drop transfer
 */

import { sortBy } from "lodash";

export enum FromTaskType {
    pickup,
    withdraw,
}

export enum ToTaskType {
    transfer,
}

export interface TransferQueueItem {
    id: number;
    from: Id<Resource<ResourceConstant>> | Id<Tombstone> | Id<Ruin> | Id<StructureContainer> | Id<StructureStorage>;
    to: Id<StructureContainer> | Id<StructureExtension> | Id<StructureSpawn> | Id<Creep> | Id<PowerCreep>;
    fromTaskType: FromTaskType;
    toTaskType: ToTaskType;
    amount: number;
    priority: number;
    resourceType: ResourceConstant;
    callback: string;
    callbackParams: any[];
}

export default {
    /**
     * 添加一个任务到队列
     * @param from 资源或者结构体或者墓碑或者残骸
     * @param to 房间位置或者creep或者powercreep或者结构体
     * @param fromTaskType pickup withdraw二选一
     * @param toTaskType drop transfer二选一
     * @param amount 要转移的数量
     * @param priority 优先级
     * @param resourceType 资源的类型
     * @param callback 当任务完成后的回调函数，这是可选的,没有的话默认为空函数
     */
    addMessage(
        from: Resource | StructureContainer | Tombstone | Ruin | StructureStorage,
        to: Creep | PowerCreep | StructureContainer | StructureExtension | StructureSpawn,
        fromTaskType: FromTaskType,
        toTaskType: ToTaskType,
        amount: number,
        priority: number,
        resourceType?: ResourceConstant,
        callback?: string,
        ...callbackParams: any[]
    ) {
        if (!Memory.transferQueue) {
            Memory.transferQueue = [];
        }
        if (!amount) amount = 150;
        // 没有的话给一个空函数
        callback = callback || "blank";
        resourceType = resourceType || RESOURCE_ENERGY;

        const message = {
            id: Game.time,
            from: from.id,
            to: to.id,
            fromTaskType,
            toTaskType,
            amount,
            priority,
            resourceType,
            callback,
            callbackParams,
        };
        Memory.transferQueue.push(message);
        console.log(`运输队列新增一个任务: ${from} 运输至 ${to}`);

        sortBy(Memory.transferQueue, "priority");
    },
};
