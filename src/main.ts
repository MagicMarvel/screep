// 游戏入口函数
import { errorMapper } from "./settings/errorMapper";
import cleanMemory from "./modules/init/cleanMemory";
import runCreep from "./modules/init/assignCreep";
import buildQueue from "./modules/creeps/buildQueue";
import { resourceCheckAndTransfer } from "./modules/transfer/resourceCheckAndTransfer";
// var watcher = require("watch-client");

export const loop = errorMapper(() => {
    cleanMemory();

    runCreep();

    // 启动creep检查建造流程

    // 十秒跑一次
    if (Game.time % 2 === 0) {
        buildQueue.checkCreepNumberAndBuild();
        resourceCheckAndTransfer();
    }

    // watcher();
});
