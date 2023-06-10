import { DELETE_MARK } from "../callback";
import { findTheNearestContainerWithEnergy } from "../utils/findTheNearestContainerWithEnergy";
import { getMark, setMark } from "../utils/markController";
import transferQueue, { FromTaskType, ToTaskType } from "./transferQueue";

/**
 * 拿能量，自动标记是否已经在队列里面发布任务
 * @param creep 一个需要能量的creep
 * @param priority 优先级
 * @param times 拿多少次
 */
export default function creepTakeEnergy(creep: Creep, priority?: number, times?: number) {
    // 目前可以拿能量
    for (let i = 1; i <= (times || 1); i++) {
        const tag = `get energy${i}`;
        if (!getMark(creep.id, tag)) {
            const source = findTheNearestContainerWithEnergy(creep);

            if (source != null) {
                setMark(creep.id, tag, true);

                if (source instanceof StructureExtension || source instanceof StructureContainer) {
                    // 在建筑物里面拿能量
                    transferQueue.addMessage(
                        source,
                        creep,
                        FromTaskType.withdraw,
                        ToTaskType.transfer,
                        Memory.transferMaximum,
                        priority || 0,
                        "energy",
                        DELETE_MARK,
                        creep.id,
                        tag
                    );
                } else {
                    // 捡能量
                    transferQueue.addMessage(
                        source,
                        creep,
                        FromTaskType.pickup,
                        ToTaskType.transfer,
                        Memory.transferMaximum,
                        priority || 0,
                        "energy",
                        DELETE_MARK,
                        creep.id,
                        tag
                    );
                }
            }
        }
    }
}
