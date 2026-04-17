import { CreepRole } from "../creepRole";

export type CreepRoleConfig = {
  name: string;
  limitAmount: number | ((roomName: string) => number);
  extraMemory: (spawn: StructureSpawn) => {};
  work: (creep: Creep) => void;
  body: {
    template: BodyPartConstant[];
    maxRepeat: number;
    minTemplate?: BodyPartConstant[]; // 能量不够 template 时的最小可用模板
  };
  priority: (roomName: string) => number;
};

export type CreepConfig = {
  [creepRole in CreepRole]: CreepRoleConfig;
};
