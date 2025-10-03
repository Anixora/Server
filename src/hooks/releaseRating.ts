import { Hook } from "../types/hook";

async function getShikimoriRating(title: string, year: number): Promise<number | null> {
    try {
        const sResponse = await fetch(`https://shikimori.one/api/animes?search=${encodeURIComponent(title)}`, {
            signal: AbortSignal.timeout(5000)
        });

        if (!sResponse.ok) return null;

        const sJsonSearch = await sResponse.json();
        if (sJsonSearch.length == 0) return null;

        const releaseId = sJsonSearch[0].id;

        const sResponseAnime = await fetch(`https://shikimori.one/api/animes/${releaseId}`, {
            signal: AbortSignal.timeout(5000)
        });

        if (!sResponseAnime.ok) return null;
        const sAnime = await sResponseAnime.json();

        return Number(sAnime.score);
    } catch (err) {
        return null;
    }
}

const ReleaseRating: Hook = {
    name: "Release Rating (Shikimori, MAL)",
    method: "GET",
    matchUrl(link: URL) {
        if (new RegExp(/\/release\/\d+/g).test(link.pathname)) return true;
        return false;
    },
    async modifyResponse(data: Record<string, any>, link: URL) {
        if (!data?.release) return data;

        const sRating = await getShikimoriRating(data.release['title_original'], data.release['year']);

        const origNote = data.release.note;

        data.release.note = `${sRating ? `<b>Рейтинг Shikimori: ${sRating}</b>` : ""}${origNote ? `${sRating ? "<br><br>":""}<b>Заметка от аниксарта:</b> ${origNote}` : ""}`

        return data;
    }
}

export default ReleaseRating;