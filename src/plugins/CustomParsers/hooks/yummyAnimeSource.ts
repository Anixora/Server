import { Hook } from "../../../types/hook";
import { getReleaseByID, getYummyAnimeRelease, getYASourcesLinks, getTypes, sourcesId } from "../utils";
import { INSTANCE_API_URL } from "../../../config";

const TARGET_REGEX = /\/episode\/target\/\d+\/\d+\/\d+/;
const SOURCE_REGEX = /^(?<source>\d{7})(?<dubber>\d*.)?$/;

function returnSources(validSources: Array<Record<string, any>>): Array<Record<string, any>> {
    let playersName: Array<string> = [];

    for (const i of validSources) {
        if (playersName.includes(i.data.player)) continue;
        playersName.push(i.data.player);
    }

    const result = playersName.map(i => ({
        sourceName: i.replace('Плеер ', ''),
        links: validSources.filter(x => x.data.player == i)
    }));

    return result;
}

const YummySources: Hook = {
    name: "YummyAnime Sources",
    method: "GET",
    matchUrl(link: URL) {
        if (new RegExp(/\/episode\/\d+\/\d+/g).test(link.pathname) ||
            new RegExp(/\/episode\/\d+\/\d+\/\d+/g).test(link.pathname) ||
            TARGET_REGEX.test(link.pathname)) return true;
        return false;
    },
    async modifyResponse(data: Record<string, any>, link: URL, logger) {
        try {
            const isTargetLink = TARGET_REGEX.test(link.pathname);
            const info = link.pathname.split("/");
            const sourceInfo = SOURCE_REGEX.exec(info[4]) ?? null;

            if (!info || (info.length > 4 && !Object.values(sourcesId).includes(Number(sourceInfo?.groups?.source)))) return data;

            const anixReleaseData = await getReleaseByID(Number(isTargetLink ? info[3] : info[2]));
            if (!anixReleaseData?.release) return data;

            const dubberTypes = await getTypes();
            if (!dubberTypes) return data;

            const dubber = dubberTypes.types.find((i: Record<string, any>) => i.id == (isTargetLink ? sourceInfo?.groups?.dubber : info[3]));

            const aAnime = await getYummyAnimeRelease(anixReleaseData.release.title_ru, anixReleaseData.release.title_original, anixReleaseData.release.year);
            if (!aAnime) return data;

            const yummySources = await getYASourcesLinks(aAnime);
            if (!yummySources) return data;

            const validSources = yummySources.response.filter((i: Record<string, any>) =>
                (dubber.name.toLowerCase().includes(i.data.dubbing.replace("Озвучка ", "").toLowerCase()) ||
                    i.data.dubbing.replace("Озвучка ", "").toLowerCase().includes(dubber.name.toLowerCase())) &&
                i.data.player.toLowerCase() != "плеер kodik"
            );

            let modifiedData = data;
            const src = returnSources(validSources);
            const source = src.find(i => sourcesId[i.sourceName.toLowerCase()] == Number(sourceInfo?.groups?.source));

            anixReleaseData.release["@id"] = 2;
            anixReleaseData.release.screenshots = [];
            anixReleaseData.release.comments = [];
            anixReleaseData.release.screenshot_images = [];
            anixReleaseData.release.related_releases = [];
            anixReleaseData.release.recommended_releases = [];
            anixReleaseData.release.video_banners = [];
            anixReleaseData.release.your_vote = 0;
            anixReleaseData.release.related_count = 0;
            anixReleaseData.release.comment_count = 0;
            anixReleaseData.release.comments_count = 0;
            anixReleaseData.release.collection_count = 0;
            anixReleaseData.release.profile_list_status = 0;

            dubber["@id"] = 4;

            switch (info.length) {
                case 6:
                    const episode = source?.links.find((x: Record<string, any>) => x.number == Number(info[5]));

                    modifiedData.code = 0;
                    modifiedData.episode = {
                        "@id": 1,
                        position: Number(info[5]),
                        release: anixReleaseData.release,
                        source: {
                            "@id": 3,
                            episodes_count: 0,
                            id: Number(sourceInfo?.groups?.source),
                            name: source?.sourceName ?? "Custom Parser",
                            type: dubber
                        },
                        name: `[CP] ${Number(info[5])} серия`,
                        url: `${INSTANCE_API_URL}/cp/parser/${source?.sourceName.toLowerCase()}?url=${Buffer.from(episode.iframe_url).toString('base64')}`,
                        iframe: false,
                        addedDate: 0,
                        is_filler: false,
                        is_watched: false
                    }
                    break;

                case 5:
                    let episodes = [];

                    for (const e of source?.links) {
                        episodes.push({
                            "@id": episodes.length == 0 ? 1 : 4 + episodes.length,
                            position: Number(e.number),
                            release: episodes.length == 0 ? anixReleaseData?.release : anixReleaseData?.release["@id"],
                            source: episodes.length == 0 ? {
                                "@id": 3,
                                episodes_count: 0,
                                id: `${sourcesId[source?.sourceName?.toLowerCase()]}${dubber.id}`,
                                name: source?.sourceName || "Unknown",
                                type: dubber
                            } : 3,
                            name: `[CP] ${e.number} серия`,
                            url: `${INSTANCE_API_URL}/cp/parser/${source?.sourceName.toLowerCase()}?url=${Buffer.from(e.iframe_url).toString('base64')}`,
                            iframe: false,
                            addedDate: 0,
                            is_filter: false,
                            is_watched: false
                        })
                    }

                    modifiedData.episodes = episodes;
                    break;

                default:
                    modifiedData.sources = modifiedData.sources.concat(src.map(i => ({
                        "@id": sourcesId[i.sourceName?.toLowerCase()],
                        episodes_count: i.links.length,
                        id: sourcesId[i.sourceName?.toLowerCase()],
                        name: i.sourceName,
                        type: 2
                    })))
                    break;
            }

            return modifiedData;
        } catch (err: any) {
            logger.error(`${err}`);
            return data;
        }
    }
}

export default YummySources;