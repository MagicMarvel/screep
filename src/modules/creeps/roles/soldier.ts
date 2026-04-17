import { CreepRole } from "../creepRole";
import type { CreepRoleConfig } from "./creepRoleConfig";

const soldierConfig: CreepRoleConfig = {
  name: "Soldier",
  limitAmount: (roomName: string) => {
    return 0;
  },
  extraMemory: (spawn) => {
    return {};
  },
  work: (creep) => {
    const enemy = creep.room.find(FIND_HOSTILE_CREEPS);
    if (enemy.length > 0) {
      if (creep.attack(enemy[0]) == ERR_NOT_IN_RANGE) {
        creep.say("⚔追击中");
        creep.moveTo(enemy[0]);
      } else {
        creep.say("⚔攻击中");
      }
      return;
    }

    creep.say("⚔巡逻中");
    moveToFlag1(creep);
  },
  body: {
    template: [ATTACK, ATTACK, MOVE],
    maxRepeat: 5,
  },
  priority: (roomName) => {
    let basePriority = 1;
    const creepNum = Memory.creepNumEachRoomEachType[roomName];
    if (
      creepNum[CreepRole.SOLDIER] == 0 &&
      Game.rooms[roomName].find(FIND_HOSTILE_CREEPS, {
        filter: (creep) => creep.body.filter((part) => part.type == "attack").length > 0,
      })
    ) {
      basePriority *= 100;
    }
    return basePriority;
  },
};

function moveToFlag1(creep: Creep) {
  if (Game.flags.Flag1) {
    creep.moveTo(Game.flags.Flag1);
  }
}

export default soldierConfig;
