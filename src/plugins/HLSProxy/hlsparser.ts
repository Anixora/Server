interface modifiedManifest {
    isVod: boolean,
    segmentDuration: number,
    prefetchUrls: Array<string>,
    manifest: string
}

interface embeddedLink {
    index: number,
    originalUrl: string,
    encodedUrl: string
}

interface ModifyOptions {
    originUrl: string
}

const M3U8_LINE_SEPARATOR_REGEX = /\s*[\r\n]+\s*/;

export class HLSParser {
    public static modifyManifest(content: string, originalLink: string, instanceLink: string, options?: ModifyOptions): modifiedManifest | null {
        let result: modifiedManifest = { isVod: false, segmentDuration: 10000, manifest: "", prefetchUrls: [] };

        try {
            const lines = content.split(M3U8_LINE_SEPARATOR_REGEX);
            const embbededUrls: Array<embeddedLink> = [];

            lines.forEach((line: string, i: number) => {
                if (line.startsWith("#EXT-X-PLAYLIST-TYPE:VOD") || line.startsWith("#EXT-X-ENDLIST")) {
                    result.isVod = true;
                }

                if (line.startsWith("#EXT-X-TARGETDURATION:")) {
                    const segmentDuration = parseInt(line.split(":")[1], 10);

                    if (!isNaN(segmentDuration)) result.segmentDuration = segmentDuration * 1000;
                }

                if (line.includes("URI=")) {
                    line = line.replace(/URI="([^"]+)"/g, (_, uri) => {
                        try {
                            const resolvedUrl = new URL(uri, originalLink).href;
                            const b64Url = btoa(options?.originUrl ? `${resolvedUrl}|${options.originUrl}` : resolvedUrl);

                            const proxiedUrl = `${instanceLink}/hlsp/${b64Url}.${uri.endsWith(".m3u8") ? "m3u8" : "ts"}`;
                            result.prefetchUrls.push(resolvedUrl);
                            return `URI="${proxiedUrl}"`;
                        } catch {
                            return `URI="${uri}"`;
                        }
                    });
                    lines[i] = line;
                }

                if (line && !line.startsWith("#")) {
                    const resolvedUrl = new URL(line, originalLink).href;
                    const b64Url = btoa(options?.originUrl ? `${resolvedUrl}|${options.originUrl}` : resolvedUrl);
                    const proxiedUrl = `${instanceLink}/hlsp/${b64Url}.${line.endsWith('.m3u8') ? 'm3u8' : 'ts'}`;

                    embbededUrls.push({ index: i, originalUrl: resolvedUrl, encodedUrl: proxiedUrl });
                    result.prefetchUrls.push(resolvedUrl);
                }
            });

            embbededUrls.forEach((e: embeddedLink) => {
                lines[e.index] = e.encodedUrl;
            });

            result.manifest = lines.join('\n');

            return result;
        } catch (err) {
            return null;
        }
    }
}