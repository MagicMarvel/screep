import { CreepRole } from "../creepRole";
import requestEnergy from "../../transfer/requestEnergy";
import type { CreepRoleConfig } from "./creepRoleConfig";

const upgraderConfig: CreepRoleConfig = {
  name: "Upgrader",
  limitAmount: (roomName: string) => {
    return 2;
  },
  extraMemory: (spawn) => {
    return {
      upgraderDetail: { upgrading: false },
    };
  },
  work: function (creep: Creep) {
    if (creep.store.getUsedCapacity() === 0) {
      creep.say("⬆等能量");
      requestEnergy(creep);
      return;
    }
    requestEnergy(creep);

    if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
      creep.say("⬆移动中");
      creep.moveTo(creep.room.controller);
    } else {
      creep.say("⬆升级中");
    }
  },
  body: {
    template: [WORK, WORK, CARRY, MOVE],
    maxRepeat: 5,
    minTemplate: [WORK, CARRY, MOVE],
  },
  priority: (roomName) => {
    const creepNum = Memory.creepNumEachRoomEachType[roomName];
    if (creepNum[CreepRole.UPGRADER] == 0) return 6;
    return 3;
  },
};

export default upgraderConfig;
