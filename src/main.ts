// 游戏入口函数
import { errorMapper } from "./settings/errorMapper";
import cleanMemory from "./modules/init/cleanMemory";
import runCreep from "./modules/init/assignCreep";
import buildQueue from "./modules/creeps/buildQueue";

export const loop = errorMapper(() => {
    cleanMemory();

    // 启动creep检查建造流程
    buildQueue.checkCreepNumberAndBuild();

    runCreep();

    resourceCheckAndTransfer();
});
