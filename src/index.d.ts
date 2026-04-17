import { CreepRole } from "./modules/creeps/creepRole";
import { TransferTask } from "./modules/transfer/transferQueue";

interface HarvesterMemory {
    targetSourceId: Id<Source>;
}

interface RepairerMemory {
    targetStructureId: Id<Structure<StructureConstant>>;
}

interface BuilderMemory {
    targetSiteId: Id<ConstructionSite<BuildableStructureConstant>>;
}

interface UpgraderMemory {
    upgrading: boolean;
}

interface ClaimerMemory {
    claiming: boolean;
}

interface TransferMemory {
    working: boolean;
    task: TransferTask;
    preTaskStorageTargetId: Id<AnyStoreStructure | Creep>;
    maxCarry: number;
    hasPickedUp: boolean;
    callback: string;
    callbackParams: any[];
}

declare global {
    interface CreepMemory {
        /**
         * 该 creep 的角色
         */
        role: CreepRole;
        upgraderDetail?: UpgraderMemory;
        harvesterDetail?: HarvesterMemory;
        builderDetail?: BuilderMemory;
        repairerDetail?: RepairerMemory;
        claimerDetail?: ClaimerMemory;
        transferDetail?: TransferMemory;
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
        spawningCreepNumEachRoomEachType?: {
            [roomName: string]: {
                [type in CreepRole]: number;
            };
        };
        transferQueue: TransferTask[];
        // 目前运输的最大能量大小，大于这个则运输不了
        transferMaximum: number;
        // 用于全局标记，主要是信号量相似的用法，用于协调多个单位
        marks: {
            [id: Id<_HasId>]: {
                [flagName: string]: any;
            };
        };
        badBuildTargets?: { [id: string]: number };
    }
}
