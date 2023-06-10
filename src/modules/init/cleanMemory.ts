import { callbacks } from "../callback";
import { CreepRole } from "../creeps/declareCreepRoleEnum";
import transferQueue from "../transfer/transferQueue";

export default function cleanMemory() {
    for (const name in Memory.creeps) {
        if (!Game.creeps[name]) {
            // 如果死去的是一个transfer
            if (Memory.creeps[name].role === CreepRole.TRANSFER) {
                // 且他在工作
                if (Memory.creeps[name].transferDetail.working == true) {
                    // 将他未完成的工作添加到队列里
                    transferQueue.addMessage(
                        Game.getObjectById(Memory.creeps[name].transferDetail.task.from),
                        Game.getObjectById(Memory.creeps[name].transferDetail.task.to),
                        Memory.creeps[name].transferDetail.task.fromTaskType,
                        Memory.creeps[name].transferDetail.task.toTaskType,
                        Memory.creeps[name].transferDetail.task.amount,
                        Memory.creeps[name].transferDetail.task.priority,
                        Memory.creeps[name].transferDetail.task.resourceType,
                        Memory.creeps[name].transferDetail.task.callback,
                        ...Memory.creeps[name].transferDetail.task.callbackParams
                    );
                }
            }
            delete Memory.creeps[name];
        }
    }
    for (const name in Memory.marks) {
        if (JSON.stringify(Memory.marks[name]) == "{}" || Game.getObjectById(name as Id<_HasId>) == null) {
            delete Memory.marks[name];
        }
    }
    delete Memory.transferMaximum;
}
