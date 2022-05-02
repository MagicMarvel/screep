import { creepType } from "./buildFactory";
import buildCreep from "./buildFactory";

export default {
  addMessage(
    spawn: StructureSpawn,
    type: creepType,
    mustUseAllEnergy: boolean = true
  ) {
    Memory.buildQueue.push(() => {
      buildCreep(spawn, type, true);
    });
  },
};
