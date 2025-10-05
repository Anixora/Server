import { Parser, IDirectLinks } from "../types";

const cvhApiUrl = "https://plapi.cdnvideohub.com/api/v1/player/sv";
const cvhVideoQualities: { quality: "1080" | "720" | "480" | "360", name: string }[] = [
    { quality: "1080", name: "mpegFullHdUrl" },
    { quality: "720", name: "mpegHighUrl" },
    { quality: "480", name: "mpegMediumUrl" },
    { quality: "360", name: "mpegLowUrl" }
];
const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

const CVH: Parser = {
    name: "CVH",
    type: "cvh",
    async parseEpisode(link: URL): Promise<IDirectLinks | null> {
        const dubberRegex = /dubbing_code=(?<dubber>[^.*&]+)/;
        const animeIdRegex = /anime_id=(?<anime>[^d&]+)/;
        const episodeRegex = /episode=(?<episode>[^d&]+)/;

        const dubber = decodeURIComponent(dubberRegex.exec(link.search)?.groups!?.dubber).replace(/\+/g, " ") ?? null;
        const animeId = animeIdRegex.exec(link.search)?.groups?.anime ?? null;
        const episode = episodeRegex.exec(link.search)?.groups?.episode ?? null;

        if (!dubber || !animeId || !episode) return null;

        const playlist = await fetch(`${cvhApiUrl}/playlist?pub=1&aggr=mali&id=${animeId}`, {
            method: "GET",
            headers: {
                "User-Agent": userAgent
            }
        });
        if (!playlist.ok) return null;

        const playlistJson = await playlist.json();
        if (!playlistJson) return null;

        const video = playlistJson.items.find((i: Record<string, any>) => i.episode == episode && i.voiceStudio == dubber);
        if (!video) return null;

        const sources = await fetch(`${cvhApiUrl}/video/${video.vkId}`, {
            method: "GET",
            headers: {
                "User-Agent": userAgent
            }
        });
        if (!sources.ok) return null;

        const sourcesJson = await sources.json();
        if (!sourcesJson) return null;

        let result: IDirectLinks = {
            master: "",
            quality: {}
        };

        cvhVideoQualities.forEach((q) => {
            if (sourcesJson.sources[q.name] != "") result.quality![q.quality] = sourcesJson.sources[q.name];
            if (result.master == "") result.master = sourcesJson.sources[q.name];
        });

        return result;
    }
}

export default CVH;