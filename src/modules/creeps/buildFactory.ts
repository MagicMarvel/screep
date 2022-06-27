import { assign } from "lodash";
import { CreepRole } from "./declareCreepRoleEnum";
import { creepConfig } from "./creepConfig";

const getBody: (energy: number, type: CreepRole) => BodyPartConstant[] = (energy, type) => {
    let body = creepConfig[type].body.basic;
    let bodyCost = 0;
    creepConfig[type].body.basic.forEach((bodypart) => {
        bodyCost += BODYPART_COST[bodypart];
    });

    while (creepConfig[type].body.perfer.length > 0) {
        let tmp = 0;
        creepConfig[type].body.perfer.forEach((bodypart) => {
            tmp += BODYPART_COST[bodypart];
        });
        if (bodyCost + tmp > energy) break;
        bodyCost += tmp;
        creepConfig[type].body.perfer.forEach((bodypart) => {
            body.push(bodypart);
        });
    }

    while (creepConfig[type].body.want.length > 0) {
        let tmp = 0;
        creepConfig[type].body.want.forEach((bodypart) => {
            tmp += BODYPART_COST[bodypart];
        });
        if (bodyCost + tmp > energy) break;
        bodyCost += tmp;
        creepConfig[type].body.want.forEach((bodypart) => {
            body.push(bodypart);
        });
    }
    return body;
};

const getName = (type: CreepRole) => {
    return creepConfig[type].name + Game.time;
};

const getMemory = (type: CreepRole, spawn: StructureSpawn): CreepMemory => {
    let memory: {
        role: CreepRole;
    } = { role: type };

    assign(memory, creepConfig[type].extraMemory(spawn));

    return memory;
};

export default {
    /**
     * 创建一个新的Creep
     * @param{StructureSpawn} spawn 要用哪一个spawn
     * @param{creepType} type 要创建哪种类型的Creep
     * @param{boolean} mustUseAllEnergy 是否必须使用所有能量（即生产最强壮的，默认为true）
     * @returns{ScreepsReturnCode} 返回spawnCreep执行结果
     */
    buildCreep: (spawn: StructureSpawn, type: CreepRole, mustUseAllEnergy: boolean): ScreepsReturnCode => {
        let energy = mustUseAllEnergy == true ? spawn.room.energyCapacityAvailable : 300;
        let body = getBody(energy, type);
        let name = getName(type);
        let memory = getMemory(type, spawn);

        // 这是全代码里唯一的一个生产Creep的地方
        let result = spawn.spawnCreep(body, name, { memory });
        if (result == OK) {
            console.log(
                `<div style="color: red;">生产Creep成功中,各种信息如下: </div>memory:${JSON.stringify(memory)} type:${type} spawn:${spawn}`
            );
        }
        return result;
    },
};
