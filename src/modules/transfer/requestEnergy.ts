import { DELETE_MARK } from "../callback";
import { findNearestEnergySource } from "../utils/findNearestEnergySource";
import { getMark, setMark } from "../utils/markController";
import transferQueue, { PickupMethod, DeliveryMethod } from "./transferQueue";

/**
 * 请求能量补给，自动标记是否已经在队列里面发布任务
 * @param creep 一个需要能量的creep
 * @param priority 优先级
 * @param times 请求多少次
 */
export default function requestEnergy(creep: Creep, priority?: number, times?: number) {
    for (let i = 1; i <= (times || 1); i++) {
        const tag = `get energy${i}`;
        if (!getMark(creep.id, tag)) {
            const source = findNearestEnergySource(creep);

            if (source != null) {
                setMark(creep.id, tag, true);

                if (source instanceof StructureExtension || source instanceof StructureContainer) {
                    // 在建筑物里面拿能量
                    transferQueue.addTask(
                        source,
                        creep,
                        PickupMethod.Withdraw,
                        DeliveryMethod.Transfer,
                        Memory.transferMaximum,
                        priority || 0,
                        RESOURCE_ENERGY,
                        DELETE_MARK,
                        creep.id,
                        tag
                    );
                } else {
                    // 捡能量
                    transferQueue.addTask(
                        source,
                        creep,
                        PickupMethod.Pickup,
                        DeliveryMethod.Transfer,
                        Memory.transferMaximum,
                        priority || 0,
                        RESOURCE_ENERGY,
                        DELETE_MARK,
                        creep.id,
                        tag
                    );
                }
            }
        }
    }
}
