import { Plugin } from "../../types/plugin";
import { Express } from "express";
import { readdirSync } from "fs";
import { Parser } from "./types";
import Logger from "../../logger";

const logger = new Logger();

function loadParsers(): Map<string, Parser> {
    const parserFiles = readdirSync(`${__dirname}/parsers`);
    const parserMap = new Map<string, Parser>();

    parserFiles.forEach(async (parserFile) => {
        const parser: Parser = (await import(`./parsers/${parserFile}`)).default;
        parserMap.set(parser.type, parser);
        logger.info(`Parser '${parser.name}' has been loaded!`);
    })

    return parserMap;
}

const parsers: Map<string, Parser> = loadParsers();

const CustomParsers: Plugin = {
    name: "Custom Parsers",
    description: "Custom Parsers for Anixart",
    version: "0.0.1",
    author: "DesConnet",
    init(app: Express,): void {
        app.get("/cp/parser/:playertype", async (req, res) => {
            try {
                const type = req.params.playertype;
                const queryUrl = Buffer.from(String(req?.query['url']), "base64").toString("ascii");

                if (!queryUrl || queryUrl == "") {
                    return res.status(400).send({ code: 400, message: "Player URL not found!" });
                }

                const url: URL = new URL(URL.canParse(queryUrl) ? queryUrl : `https://${queryUrl}`);
                const parser = parsers.get(type);

                if (!parser) {
                    return res.status(404).send({ code: 404, message: "Parser not found!" });
                }
                const result = await parser?.parseEpisode(url);

                if (!result) {
                    return res.status(500).send({ code: 500, message: "Link can't be parsed!" });
                }

                return res.status(200).send({ code: 0, result});
            } catch (err) {
                logger.error(`[Custom Parsers] Error: ${err}`);
                res.status(500).send({ code: 500, message: "[Custom Parsers] Unexpected error!", error: err });
            }
        });
    }
}

export default CustomParsers;