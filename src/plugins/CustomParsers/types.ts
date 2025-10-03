export interface ResultParse {
    type: string,
    master: string,
    quality?: Record<string, string>,
    info: Record<string, string>
}

export interface Parser {
    name: string,
    description?: string,
    type: string,
    parseEpisode(link: URL): Promise<IDirectLinks | null>;
}

export interface Hook {
    
}

export interface IDirectLinks {
    master: string,
    quality?: Partial<Record<"1080"|"720"|"480"|"360", string>>,
}