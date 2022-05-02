/** @param {Creep} creep **/
export default function run(creep: Creep) {
  // 要采集哪一个资源
  let source = Game.getObjectById(creep.memory.harvesterDetail.harvesterWhich);

  // 当资源点不在范围内的时候，移动过去
  if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
    creep.moveTo(source, {
      visualizePathStyle: { stroke: "#ffaa00" },
    });
  }
}
