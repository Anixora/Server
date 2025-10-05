import { Parser, IDirectLinks } from "../types";

const aksor: Parser = {
    name: "Aksor",
    type: "aksor",
    async parseEpisode(link: URL): Promise<IDirectLinks | null> { 
        const videoUrlRegex = /\s*var\s*videoUrl\s*=\s*"(?<link>[^"]+)"/g;
        const request = await fetch(link);

        const text = await request.text();
        const videoUrl = videoUrlRegex.exec(text)?.groups?.link ?? null;

        if (!videoUrl) return null;

        return { master: videoUrl };
    },
};

export default aksor;