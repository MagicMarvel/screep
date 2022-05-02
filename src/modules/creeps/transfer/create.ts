import { CreepRole } from "../declareCreepRoleEnum";

export default (spawn: StructureSpawn) => {
  let transferer: number = 0;

  for (const name in Game.creeps) {
    const creep = Game.creeps[name];
    if (creep.memory.role == CreepRole.TRANSFER) {
      transferer++;
    }
  }

  if (transferer < 4) {
    spawn.spawnCreep(
      // [CARRY, MOVE, CARRY, MOVE, CARRY, MOVE],
      [CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY],
      "Transferer" + Game.time,
      {
        memory: {
          role: CreepRole.TRANSFER,
        },
      }
    );
  }
};
