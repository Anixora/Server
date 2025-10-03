import Logger from "../logger";

export interface Hook {
    name: string,
    description?: string,
    method: "GET" | "POST",
    matchUrl(link: URL): boolean;
    modifyResponse(data: Record<string, any>, link: URL, logger: Logger): Promise<object>;
}