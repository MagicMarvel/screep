import { CreepRole } from "../declareCreepRoleEnum";
export default (spawn: StructureSpawn) => {
  let upgrader: number = 0;

  for (const name in Game.creeps) {
    const creep = Game.creeps[name];
    if (creep.memory.role == CreepRole.UPGRADER) {
      upgrader++;
    }
  }

  if (upgrader < 3) {
    spawn.spawnCreep(
      [WORK, WORK, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE],
      // [WORK, CARRY, MOVE, CARRY, MOVE],
      "Upgrader" + Game.time,
      {
        memory: {
          role: CreepRole.UPGRADER,
          upgradeDetail: { upgrading: false },
        },
      }
    );
  }
};
