import createHarvester from "../creeps/harvester/create";
import createBuilder from "../creeps/builder/create";
import createUpgrader from "../creeps/upgrader/create";
import createNormalSoldier from "../creeps/soldier/normalSoldier/create";
import createRepairer from "../creeps/repairer/create";
import createTransfer from "../creeps/transfer/create";
export default (spawn: StructureSpawn) => {
  createHarvester(spawn);
  createTransfer(spawn);
  createUpgrader(spawn);
  createBuilder(spawn);
  createRepairer(spawn);
  // createNormalSoldier(spawn);
};
