/**
 * 为某个主体在Memory上添加一个标记
 * @param id 要打标记主体的id号，主要是为了标记的唯一性
 * @param flagName 标记名
 * @param value 标记值
 */
export function setMark(id: Id<_HasId>, flagName: string, value: any) {
    if (!Memory.marks) {
        Memory.marks = {};
    }
    if (!Memory.marks[id]) {
        Memory.marks[id] = {};
    }
    Memory.marks[id][flagName] = value;
}

/**
 * 返回一个主体的某个标记的值
 * @param id 主体的id号
 * @param flagName 标记名
 * @returns 标记值
 */
export function getMark(id: Id<_HasId>, flagName: string) {
    if (!Memory.marks) {
        return null;
    }
    if (!Memory.marks[id]) {
        return null;
    }
    return Memory.marks[id][flagName];
}

/**
 * 删除一个主体的某个标记
 * @param id 要删除标记的主体id号
 * @param flagName 标记名
 */
export function deleteMark(id: Id<_HasId>, flagName: string) {
    if (!Memory.marks) {
        return;
    }
    if (!Memory.marks[id]) {
        return;
    }
    delete Memory.marks[id][flagName];
}
