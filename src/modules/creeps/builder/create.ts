import { CreepRole } from "../declareCreepRoleEnum";

export default (spawn: StructureSpawn) => {
  let builder: number = 0;

  for (const name in Game.creeps) {
    const creep = Game.creeps[name];
    if (creep.memory.role == CreepRole.BUILDER) {
      builder++;
    }
  }

  if (builder < 4) {
    spawn.spawnCreep(
      [WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE],
      "Builder" + Game.time,
      {
        memory: {
          role: CreepRole.BUILDER,
          builderDetail: {
            building: false,
          },
        },
      }
    );
  }
};
