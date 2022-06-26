// 游戏入口函数
import { errorMapper } from "./settings/errorMapper";
import cleanMemory from "./modules/init/cleanMemory";
import runCreep from "./modules/init/assignCreep";
import buildQueue from "./modules/creeps/buildQueue";
import { resourceCheckAndTransfer } from "./modules/transfer/resourceCheckAndTransfer";

export const loop = errorMapper(() => {
    cleanMemory();

    runCreep();

    // 启动creep检查建造流程
    buildQueue.checkCreepNumberAndBuild();
    resourceCheckAndTransfer();

    // 十秒跑一次
    if (Game.time % 10 === 0) {
    }
});
