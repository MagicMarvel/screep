/** @param {Creep} creep **/
export default function (creep: Creep) {
  var enemy = creep.room.find(FIND_HOSTILE_CREEPS);
  if (enemy.length > 0) {
    if (creep.attack(enemy[0]) == ERR_NOT_IN_RANGE) {
      creep.moveTo(enemy[0]);
    }
  } else {
    creep.moveTo(Game.flags.Flag1);
  }
}
