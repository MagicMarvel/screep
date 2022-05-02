import runBuilder from "../creeps/builder/run";
import runHarvester from "../creeps/harvester/run";
import runUpgrader from "../creeps/upgrader/run";
import { CreepRole } from "../creeps/declareCreepRoleEnum";
import runSoldier from "../creeps/soldier/normalSoldier/run";
import runRepairer from "../creeps/repairer/run";
import runTransfer from "../creeps/transfer/run";

export default () => {
  if (Object.keys(Game.creeps).length >= 0) {
    for (const name in Game.creeps) {
      const creep = Game.creeps[name];

      if (creep.memory.role === CreepRole.HARVESTER) {
        runHarvester(creep);
      }

      if (creep.memory.role === CreepRole.BUILDER) {
        runBuilder(creep);
      }

      if (creep.memory.role === CreepRole.UPGRADER) {
        runUpgrader(creep);
      }

      if (creep.memory.role === CreepRole.SOLDIER) {
        runSoldier(creep);
      }

      if (creep.memory.role === CreepRole.REPAIRER) {
        runRepairer(creep);
      }
      if (creep.memory.role === CreepRole.TRANSFER) {
        runTransfer(creep);
      }
    }
  }
};
