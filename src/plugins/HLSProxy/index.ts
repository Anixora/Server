import { Plugin } from "../../types/plugin";
import { Express } from "express";
import { HLSParser } from "./hlsparser";
import { INSTANCE_API_URL } from "../../config";
import { Readable } from "stream";

const HLSProxy: Plugin = {
    name: "HLS Proxy",
    description: "Проксирование HLS потока",
    author: "DesConnet",
    version: "0.0.1",
    init(app: Express, logger): void {
        app.get("/hlsp/:link", async (req, res) => {
            logger.debug(`[HLS Proxy] Request: ${req.params.link}`);
            try {
                const encodedLink = req.params.link.replace(".m3u8", "").replace(".m3u", "").replace(".ts", "");
                const link = atob(encodedLink).split("|");

                const request = await fetch(link[0], {
                    headers: {
                        "Origin": link[1] ?? ""
                    }
                });

                res.setHeader("Access-Control-Allow-Origin", "*");
                res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
                res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");
                res.setHeader("Content-Type", request.headers.get("Content-Type") ?? "video/mp2t");

                if (req.params.link.endsWith(".ts")) {
                    const readStream = Readable.fromWeb(request.body as any);
                    readStream.pipe(res);
                } else {
                    const manifest = await request.text();
                    const response = HLSParser.modifyManifest(manifest, link[0], INSTANCE_API_URL, { originUrl: link[1] ?? null });

                    res.send(response?.manifest);
                }
            } catch (err) {
                logger.error(`[HLS Proxy] Error: ${err}`);
                res.status(500).send({ code: 500, message: "[HLS Proxy] Unexpected error!", error: err });
            }
        });
    }
}

export default HLSProxy;