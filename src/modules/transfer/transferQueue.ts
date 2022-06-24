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
    from: Id<Resource<ResourceConstant>> | Id<Structure<StructureConstant>> | Id<Tombstone> | Id<Ruin>;
    to: Id<Structure<StructureConstant>> | Id<Creep> | Id<PowerCreep>;
    fromTaskType: FromTaskType;
    toTaskType: ToTaskType;
    amount: number;
    priority: number;
}

export default {
    addMessage(
        from: Resource | Structure | Tombstone | Ruin,
        to: Creep | PowerCreep | Structure,
        fromTaskType: FromTaskType,
        toTaskType: ToTaskType,
        amount: number,
        priority: number
    ) {
        if (!Memory.transferQueue) {
            Memory.transferQueue = [];
        }
        const message = {
            from: from.id,
            to: to.id,
            fromTaskType,
            toTaskType,
            amount,
            priority,
        };
        Memory.transferQueue.push(message);
        sortBy(Memory.transferQueue, "priority");
    },
};
