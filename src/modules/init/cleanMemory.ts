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
                    const task = Memory.creeps[name].transferDetail.task;
                    const from = Game.getObjectById(task.from);
                    const to = Game.getObjectById(task.to);
                    // from或to已经不存在了，任务无效，直接跳过
                    if (from && to) {
                        transferQueue.addMessage(
                            from,
                            to,
                            task.fromTaskType,
                            task.toTaskType,
                            task.amount,
                            task.priority,
                            task.resourceType,
                            task.callback,
                            ...task.callbackParams
                        );
                    }
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
