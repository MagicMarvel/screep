import { CreepRole } from "../../declareCreepRoleEnum";

export default (spawn: StructureSpawn) => {
  let soldier: number = 0;

  for (const name in Game.creeps) {
    const creep = Game.creeps[name];
    if (creep.memory.role == CreepRole.SOLDIER) {
      soldier++;
    }
  }

  if (soldier < 10) {
    spawn.spawnCreep(
      [ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE],
      "Soldier" + Game.time,
      {
        memory: {
          role: CreepRole.SOLDIER,
        },
      }
    );
  }
};
