import { INSTANCE_API_URL } from "../../config";

const YUMMYANIME_API_URL = "https://api.yani.tv";

export const sourcesId: { [key: string]: number } = {
    "cvh": 1000001,
    "alloha": 1000002,
    "aksor": 1000003
}

export async function getShikimoriId(title: string, year?: number): Promise<number | null> {
    try {
        const sResponse = await fetch(`https://shikimori.one/api/animes?search=${encodeURIComponent(title)}`, {
            signal: AbortSignal.timeout(5000)
        });

        if (!sResponse.ok) return null;

        const sJsonSearch = await sResponse.json();
        if (sJsonSearch.length == 0) return null;

        return Number(sJsonSearch[0]?.id) || null;
    } catch (err) {
        return null;
    }
}

export async function getReleaseByID(id: number): Promise<Record<string, any> | null> {
    try {
        const aRes = await fetch(`https://api.anixart.app/release/${id}`);
        if (!aRes.ok) return null;

        const aJSON = await aRes.json();
        if (!aJSON) return null;

        return aJSON;
    } catch (err) {
        return null;
    }
}

export async function getTypes(): Promise<Record<string, any> | null> {
    try {
        const aRes = await fetch(`https://api.anixart.app/type/all`);
        if (!aRes.ok) return null;

        const aJSON = await aRes.json();
        if (!aJSON) return null;

        return aJSON;
    } catch (err) {
        return null;
    }
}

export async function getYummyAnimeRelease(titleRu: string, titleOrig: string, year: number): Promise<Record<string, any> | null> {
    try {
        const aResponse = await fetch(`${YUMMYANIME_API_URL}/search?q=${titleRu}&limit=20&offset=0`, {
            signal: AbortSignal.timeout(5000)
        });

        if (!aResponse.ok) return null;

        const aSearch: Record<string, any> = await aResponse.json();
        if (!aSearch) return null;

        const sId = await getShikimoriId(titleOrig);
        if (!sId) return null;

        const findAnime = aSearch.response.find((item: Record<string, any>) => item.remote_ids.shikimori_id == sId);

        if (!findAnime) return null;

        return findAnime;
    } catch (err) {
        return null;
    }
}

export async function getYASourcesLinks(anime: Record<string, any>): Promise<Record<string, any> | null> {
    try {
        const aResponse = await fetch(`${YUMMYANIME_API_URL}/anime/${anime.anime_id}/videos`);

        if (!aResponse.ok) return null;
        const resJSON = await aResponse.json();

        if (resJSON.length == 0) return null;

        return resJSON;
    } catch (err) {
        return null;
    }
}

export function returnLinkToHLSProxy(b64Link: string, format: string = "m3u8"): string {
    return `${INSTANCE_API_URL}/hlsp/${b64Link}.${format}`;
}