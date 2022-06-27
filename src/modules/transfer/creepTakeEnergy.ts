import { DELETE_MARK } from "../callback";
import { findTheNearestContainerWithEnergy } from "../utils/findTheNearestContainerWithEnergy";
import { getMark, setMark } from "../utils/markController";
import transferQueue, { FromTaskType, ToTaskType } from "./transferQueue";

/**
 * 拿能量，自动标记是否已经在队列里面发布任务
 * @param creep 一个需要能量的creep
 */
export default function creepTakeEnergy(creep: Creep, priority?: number) {
    // console.log("get energy now");
    // 目前可以拿能量
    if (!getMark(creep.id, "get engergy")) {
        const source = findTheNearestContainerWithEnergy(creep);

        if (source != null) {
            setMark(creep.id, "get engergy", true);

            if (source instanceof StructureExtension || source instanceof StructureContainer) {
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
                    "get engergy"
                );
            } else {
                transferQueue.addMessage(
                    source,
                    creep,
                    FromTaskType.pickup,
                    ToTaskType.transfer,
                    Memory.transferMaximum,
                    0,
                    "energy",
                    DELETE_MARK,
                    creep.id,
                    "get engergy"
                );
            }
        }
    }
}
