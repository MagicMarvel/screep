import buildQueue from "./modules/buildFactory";
import { CreepRole } from "./modules/creeps/declareCreepRoleEnum";

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
    lowPower?: boolean;
  }

  interface Memory {
    buildQueue?: Function[];
  }
}
