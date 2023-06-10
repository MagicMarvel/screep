import { creepConfig } from "../creeps/creepConfig";

export default () => {
  if (Object.keys(Game.creeps).length >= 0) {

    for (const name in Game.creeps) {
      const creep = Game.creeps[name];
      creepConfig[creep.memory.role].work(creep);
    }
  }
};
