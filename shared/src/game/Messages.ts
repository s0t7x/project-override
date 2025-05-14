import { ServerErrorMessageType } from "misc/ServerError";
import { AuthMessageType } from "./Auth";

export type IMessageType = 'generic' 
    | ServerErrorMessageType
    | AuthMessageType;

export type IMessage = {
    type: IMessageType;
}