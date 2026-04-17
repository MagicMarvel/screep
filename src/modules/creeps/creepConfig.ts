import { CreepRole } from "./creepRole";
import type { CreepConfig } from "./roles/creepRoleConfig";
import harvesterConfig from "./roles/harvester";
import upgraderConfig from "./roles/upgrader";
import builderConfig from "./roles/builder";
import claimerConfig from "./roles/claimer";
import repairerConfig from "./roles/repairer";
import soldierConfig from "./roles/soldier";
import transferConfig from "./roles/transfer";

export const creepConfig: CreepConfig = {
    [CreepRole.HARVESTER]: harvesterConfig,
    [CreepRole.UPGRADER]: upgraderConfig,
    [CreepRole.BUILDER]: builderConfig,
    [CreepRole.CLAIMER]: claimerConfig,
    [CreepRole.REPAIRER]: repairerConfig,
    [CreepRole.SOLDIER]: soldierConfig,
    [CreepRole.TRANSFER]: transferConfig,
};
