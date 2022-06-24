import buildQueue from "./modules/creeps/buildFactory";
import { CreepRole } from "./modules/creeps/declareCreepRoleEnum";
import { TransferQueueItem } from "./modules/transfer/transferQueue";

interface harvesterDetail {
    harvesterWhich: Id<Source>;
}

interface repairerDetail {
    repairing: boolean;
}

interface builderDetail {
    building: boolean;
}

interface upgradeDetail {
    upgrading: boolean;
}

interface claimerDetail {
    claiming: boolean;
}

interface transferDetail {
    working: boolean;
    task: TransferQueueItem;
    storeStructureBeforeWorking: AnyStructure;
    maxCarry: number;
    arriveFrom: boolean;
}

declare global {
    interface CreepMemory {
        /**
         * 该 creep 的角色
         */
        role: CreepRole;
        upgradeDetail?: upgradeDetail;
        harvesterDetail?: harvesterDetail;
        builderDetail?: builderDetail;
        repairerDetail?: repairerDetail;
        claimerDetail?: claimerDetail;
        transferDetail?: transferDetail;
    }

    interface Memory {
        buildQueue?: {
            // 这里只能记录spawn的id不能记录spawn本身，spawn会随着时间变化
            spawnId: Id<StructureSpawn>;
            type: CreepRole;
            mustUseAllEnergy: boolean;
        }[];
        dev: boolean;
        creepNumEachRoomEachType?: {
            [roomName: string]: {
                [type in CreepRole]: number;
            };
        };
        swaningCreepNumEachRoomEachType?: {
            [roomName: string]: {
                [type in CreepRole]: number;
            };
        };
        transferQueue: TransferQueueItem[];
        // 目前运输的最大能量大小，大于这个则运输不了
        transferMaximum: number;
    }
}
