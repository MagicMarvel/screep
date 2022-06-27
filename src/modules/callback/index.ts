import { deleteMark } from "../utils/markController";

export const DELETE_MARK = "deleteMark";
export const BLANK = "blank";

export const callbacks = {
    [DELETE_MARK]: deleteMark,
    [BLANK]: () => {},
};
