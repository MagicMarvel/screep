/**
 * 在每个 source 旁边自动放置 container
 * 当 source 旁没有 container 且没有建筑工地时，在最佳位置创建工地
 * 选离 spawn 最近的位置，方便 Transfer 搬运
 */
export const placeContainers = () => {
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        if (!room.controller?.my || room.controller.level < 2) continue;

        const sources = room.find(FIND_SOURCES);
        const spawnPos = room.find(FIND_MY_SPAWNS)[0]?.pos;

        for (const source of sources) {
            // 已有 container
            const existingContainer = room.find(FIND_STRUCTURES, {
                filter: (s) => s.structureType === STRUCTURE_CONTAINER && s.pos.inRangeTo(source, 1),
            })[0];
            if (existingContainer) continue;

            // 已有建筑工地
            const existingSite = room.find(FIND_CONSTRUCTION_SITES, {
                filter: (s) => s.structureType === STRUCTURE_CONTAINER && s.pos.inRangeTo(source, 1),
            })[0];
            if (existingSite) continue;

            // 寻找 source 旁边的可用位置
            const candidates: { x: number; y: number }[] = [];
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    const x = source.pos.x + dx;
                    const y = source.pos.y + dy;
                    if (x < 1 || x > 48 || y < 1 || y > 48) continue;
                    if (room.getTerrain().get(x, y) === TERRAIN_MASK_WALL) continue;
                    const structures = room.lookForAt(LOOK_STRUCTURES, x, y);
                    if (structures.length > 0) continue;
                    const sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);
                    if (sites.length > 0) continue;
                    candidates.push({ x, y });
                }
            }

            if (candidates.length === 0) continue;

            // 选离 spawn 最近的位置
            let best = candidates[0];
            let minDist = Infinity;
            for (const c of candidates) {
                const dist = spawnPos ? spawnPos.getRangeTo(c.x, c.y) : 0;
                if (dist < minDist) {
                    minDist = dist;
                    best = c;
                }
            }

            const result = room.createConstructionSite(best.x, best.y, STRUCTURE_CONTAINER);
            if (result === OK) {
                console.log(`[Container] 在 ${roomName} ${best.x},${best.y} 建造 container`);
            }
        }
    }
};
