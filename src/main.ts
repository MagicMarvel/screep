// 游戏入口函数
import { errorMapper } from "./settings/errorMapper";
import createCreep from "./modules/init/createCreep";
import cleanMemory from "./modules/init/cleanMemory";
import runCreep from "./modules/init/assignCreep";
import { CreepRole } from "./modules/creeps/declareCreepRoleEnum";

export const loop = errorMapper(() => {
  cleanMemory();
  for (const name in Game.spawns) createCreep(Game.spawns[name]);

  runCreep();
});
