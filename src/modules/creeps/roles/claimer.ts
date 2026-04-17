import getEnergyFromStructure from "../../utils/getEnergyFromStructure";
import type { CreepRoleConfig } from "./creepRoleConfig";

const claimerConfig: CreepRoleConfig = {
  name: "Claimer",
  limitAmount: (roomName: string) => {
    return 0;
  },
  extraMemory: (spawn) => {
    return {
      claimerDetail: {
        claiming: false,
      },
    };
  },
  work: (creep) => {
    if (!creep.memory.claimerDetail.claiming) {
      creep.say("🚩取能量");
      getEnergyFromStructure(creep);
      return;
    }

    if (creep.claimController(creep.room.controller) == ERR_NOT_IN_RANGE) {
      creep.say("🚩移动中");
      creep.moveTo(creep.room.controller);
    } else {
      creep.say("🚩占领中");
    }
  },
  body: {
    template: [CLAIM, MOVE],
    maxRepeat: 1,
  },
  priority: (roomName) => {
    let basePriority = 1;

    return basePriority;
  },
};

export default claimerConfig;
