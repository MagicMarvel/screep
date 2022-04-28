// 游戏入口函数
import { errorMapper } from "./modules/errorMapper";
import { roleBuilder } from "./role.builder";
import { roleHarvester } from "./role.harvester";
import { roleUpgrader } from "./role.upgrader";
import creepCreater from "./creep.creater";

export const loop = errorMapper(() => {
  creepCreater();
  if (Object.keys(Game.creeps).length >= 0) {
    for (const name in Game.creeps) {
      const creep = Game.creeps[name];
      if (creep.memory.role === "harvester") {
        roleHarvester.run(creep);
      }

      if (creep.memory.role === "builder") {
        roleBuilder.run(creep);
      }

      if (creep.memory.role === "upgrader") {
        roleUpgrader.run(creep);
      }
    }
  }
});
