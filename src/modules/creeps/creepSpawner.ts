import { assign } from 'lodash'
import { CreepRole } from './creepRole'
import { creepConfig } from './creepConfig'

const ENERGY_THRESHOLD_RATIO = 0.7;

/**
 * 判断某角色在指定房间是否数量为0（需要紧急生产）
 * 读不到数据时也视为紧急，避免死锁
 */
function isUrgent(type: CreepRole, roomName: string): boolean {
    const count = Memory.creepNumEachRoomEachType?.[roomName]?.[type]
    return count === 0 || count === undefined
}

const assembleBody: (energy: number, type: CreepRole) => BodyPartConstant[] | null = (
    energy,
    type
) => {
    const { template, maxRepeat, minTemplate } = creepConfig[type].body
    const templateCost = template.reduce((sum, part) => sum + BODYPART_COST[part], 0)

    // 能量够完整模板，重复模板
    if (templateCost <= energy) {
        const repeat = Math.min(maxRepeat, Math.floor(energy / templateCost))
        const body: BodyPartConstant[] = []
        for (let i = 0; i < repeat; i++) {
            body.push(...template)
        }
        return body
    }

    // 能量不够完整模板，尝试最小模板兜底
    if (minTemplate) {
        const minCost = minTemplate.reduce((sum, part) => sum + BODYPART_COST[part], 0)
        if (minCost <= energy) {
            return [...minTemplate]
        }
    }

    return null
}

const generateCreepName = (type: CreepRole) => {
    return creepConfig[type].name + Game.time
}

const createCreepMemory = (type: CreepRole, spawn: StructureSpawn): CreepMemory => {
    let memory: {
        role: CreepRole
    } = { role: type }

    assign(memory, creepConfig[type].extraMemory(spawn))

    return memory
}

export default {
    /**
     * 创建一个新的Creep
     * @param{StructureSpawn} spawn 要用哪一个spawn
     * @param{creepType} type 要创建哪种类型的Creep
     * @param{boolean} useMaxEnergy 是否必须使用所有能量（即生产最强壮的，默认为true）
     * @returns{ScreepsReturnCode} 返回spawnCreep执行结果
     */
    spawnCreep: (
        spawn: StructureSpawn,
        type: CreepRole,
        useMaxEnergy: boolean
    ): ScreepsReturnCode => {
        let energy: number;
        if (!useMaxEnergy || isUrgent(type, spawn.room.name)) {
            energy = spawn.room.energyAvailable;
        } else {
            // 可用能量达到阈值即开始生产，减少spawn空闲等待时间
            const available = spawn.room.energyAvailable;
            const capacity = spawn.room.energyCapacityAvailable;
            energy = available >= capacity * ENERGY_THRESHOLD_RATIO ? available : capacity;
        }
        let body = assembleBody(energy, type)

        // 能量不足以组装一个完整的模板，放弃生产
        if (!body) {
            return ERR_NOT_ENOUGH_RESOURCES
        }

        let name = generateCreepName(type)
        let memory = createCreepMemory(type, spawn)

        // 这是全代码里唯一的一个生产Creep的地方
        let result = spawn.spawnCreep(body, name, { memory })

        if (result == OK) {
            console.log(
                `[生产Creep成功] memory:${JSON.stringify(
                    memory,
                    (_key, value) => typeof value === 'number' && CreepRole[value] ? CreepRole[value] : value
                )} type:${CreepRole[type]} spawn:${spawn}`
            )
        }
        return result
    }
}
