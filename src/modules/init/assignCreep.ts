import { creepConfig } from "../creeps/creepConfig";

export default () => {
  for (const name in Game.creeps) {
    const creep = Game.creeps[name];
    const config = creepConfig[creep.memory.role];
    if (config) {
      config.work(creep);
    }
  }
};
