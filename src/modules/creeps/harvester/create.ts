import { CreepRole } from "../declareCreepRoleEnum";

/**
 *
 * @param spawn 制造creep的spawn
 * @returns 0为正确（本次无需建造或者建造成功），-1为建造失败
 */
export default function createHarvester(spawn: StructureSpawn) {
  let harvester: number = 0;
  let harvestingEachSourceCreepNum: { [sourceId: Id<Source>]: number } = {};

  for (const name in Game.creeps) {
    const creep = Game.creeps[name];
    if (creep.memory.role == CreepRole.HARVESTER) {
      harvester++;
      if (
        harvestingEachSourceCreepNum[
          creep.memory.harvesterDetail.harvesterWhich
        ] == null
      ) {
        harvestingEachSourceCreepNum[
          creep.memory.harvesterDetail.harvesterWhich
        ] = 1;
      } else {
        harvestingEachSourceCreepNum[
          creep.memory.harvesterDetail.harvesterWhich
        ]++;
      }
    }
  }

  for (const name in harvestingEachSourceCreepNum) {
    if (harvestingEachSourceCreepNum[name] < 1) {
      if (
        spawn.spawnCreep(
          [WORK, WORK, WORK, WORK, MOVE],
          "Harvester" + Game.time,
          {
            memory: {
              role: CreepRole.HARVESTER,
              harvesterDetail: {
                harvesterWhich: name as Id<Source>,
              },
            },
          }
        ) != OK
      ) {
        return -1;
      } else return 0;
    }
  }

  for (const source of spawn.room.find(FIND_SOURCES)) {
    const sourceID = source.id;
    if (harvestingEachSourceCreepNum[sourceID] == null) {
      if (
        spawn.spawnCreep(
          [WORK, WORK, WORK, WORK, MOVE],
          "Harvester" + Game.time,
          {
            memory: {
              role: CreepRole.HARVESTER,
              harvesterDetail: {
                harvesterWhich: sourceID,
              },
            },
          }
        ) != OK
      ) {
        return -1;
      } else return 0;
    }
  }
}
