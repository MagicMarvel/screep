/**
 * 判断一个source附近是否已经太拥挤（>=4个creep）
 */
export function isSourceTooCrowded(source: Source, maxCreeps = 4): boolean {
    const creepsNearSource = source.room.find(FIND_MY_CREEPS, {
        filter: (c) => c.pos.getRangeTo(source) <= 1,
    });
    return creepsNearSource.length >= maxCreeps;
}
