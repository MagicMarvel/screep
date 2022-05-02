import { CreepRole } from "../declareCreepRoleEnum";

export default (spawn: StructureSpawn) => {
  let repairer: number = 0;

  for (const name in Game.creeps) {
    const creep = Game.creeps[name];
    if (creep.memory.role == CreepRole.REPAIRER) {
      repairer++;
    }
  }

  if (repairer < 3) {
    spawn.spawnCreep(
      [WORK, CARRY, MOVE, MOVE, CARRY, MOVE, CARRY, WORK],
      "Repairer" + Game.time,
      {
        memory: {
          role: CreepRole.REPAIRER,
          repairerDetail: {
            repairing: false,
          },
        },
      }
    );
  }
};
