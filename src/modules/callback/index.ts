import { deleteMark, getMark } from "../utils/markController";

export const DELETE_MARK = "deleteMark";
export const DECREMENT_MARK = "decrementMark";
export const NOOP = "noop";

export const callbacks: Record<string, (...args: any[]) => void> = {
    [DELETE_MARK]: deleteMark,
    [DECREMENT_MARK]: (id: Id<_HasId>, tag: string) => {
        const current = getMark(id, tag);
        if (current !== null && current !== undefined) {
            const decremented = (current as number) - 1;
            if (decremented <= 0) {
                deleteMark(id, tag);
            } else {
                const { setMark } = require("../utils/markController") as typeof import("../utils/markController");
                setMark(id, tag, decremented);
            }
        }
    },
    [NOOP]: () => {},
};
