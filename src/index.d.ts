import buildQueue from "./modules/creeps/buildFactory";
import { CreepRole } from "./modules/creeps/declareCreepRoleEnum";
import { TransferQueueItem } from "./modules/transfer/transferQueue";

interface harvesterDetail {
    harvesterWhich: Id<Source>;
}

interface repairerDetail {
    repairingWhich: Id<Structure<StructureConstant>>;
}

interface builderDetail {
    buildingWhich: Id<ConstructionSite<BuildableStructureConstant>>;
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
    storeStructureBeforeWorking: Id<AnyStoreStructure | Creep>;
    maxCarry: number;
    arriveFrom: boolean;
    callback: string;
    callbackParams: any[];
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
        // 用于全局标记，主要是信号量相似的用法，用于协调多个单位
        marks: {
            [id: Id<_HasId>]: {
                [flagName: string]: any;
            };
        };
    }
}
