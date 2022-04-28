export default () => {
  let harvester = 0,
    builder = 0,
    upgrader = 0;
  for (const name in Game.creeps) {
    const creep = Game.creeps[name];
    const role = creep.memory.role;
    switch (role) {
      case "harvester":
        harvester++;
      case "upgrader":
        upgrader++;
      case "builder":
        builder++;
      default:
    }
  }

  if (harvester < 2) {
    Game.spawns["Spawn1"].spawnCreep(
      [WORK, CARRY, MOVE],
      "Harvester" + Game.time,
      {
        memory: {
          role: "harvester",
        },
      }
    );
  }
  if (builder < 2) {
    Game.spawns["Spawn1"].spawnCreep(
      [WORK, CARRY, MOVE],
      "Builder" + Game.time,
      {
        memory: {
          role: "builder",
        },
      }
    );
  }

  if (upgrader < 2) {
    Game.spawns["Spawn1"].spawnCreep(
      [WORK, CARRY, MOVE],
      "Upgrader" + Game.time,
      {
        memory: {
          role: "upgrader",
        },
      }
    );
  }
};
