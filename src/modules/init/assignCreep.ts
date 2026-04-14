import { creepConfig } from "../creeps/creepConfig";

export default () => {
  for (const name in Game.creeps) {
    const creep = Game.creeps[name];
    creepConfig[creep.memory.role].work(creep);
  }
};
