import express from 'express';
import { Express } from 'express';
import { ANIXART_API_URL, ANIXART_HEADERS, BAPROXY_VERSION, DEFAULT_ANIXART_HEADERS, INSTANCE_API_URL, SERVER_PORT } from './config';
import { readdirSync, existsSync } from 'fs';
import { Hook } from './types/hook';
import { LOGGER_LEVEL } from "./logger";
import Logger from './logger';
import { Plugin } from './types/plugin';
import { ASCII_ART } from './utils';

const logger = new Logger(LOGGER_LEVEL.ERROR);

function loadHooks(): Map<string, Hook> {
    const hookFiles = readdirSync(`${__dirname}/hooks`);
    const hookMap = new Map<string, Hook>();

    hookFiles.forEach(async (hookFile) => {
        const hook: Hook = require(`./hooks/${hookFile}`).default;
        hookMap.set(hook.name, hook);
        logger.info(`Hook '${hook.name}' has been loaded!`);
    })

    return hookMap;
}

function loadPlugins(app: Express, hooks: Map<string, Hook>): Map<string, Plugin> {
    const pluginFolders = readdirSync(`${__dirname}/plugins`);
    const pluginMap = new Map<string, Plugin>();

    pluginFolders.forEach(async (pluginFolder) => {
        const plugin: Plugin = require(`./plugins/${pluginFolder}/index`).default;
        if (existsSync(`${__dirname}/plugins/${pluginFolder}/hooks`)) {
            const hookFiles = readdirSync(`${__dirname}/plugins/${pluginFolder}/hooks`);
            hookFiles.forEach(async (hookFile) => {
                const hook: Hook = require(`./plugins/${pluginFolder}/hooks/${hookFile}`).default;
                hooks.set(hook.name, hook);
                logger.info(`Hook '${hook.name}' has been loaded!`);
            })
        }
        plugin.init(app, logger);
        pluginMap.set(plugin.name, plugin);
        logger.info(`Plugin '${plugin.name}' v${plugin.version} by ${plugin.author} has been loaded!`);
    })

    return pluginMap;
}


export class AnixartServer {
    public app: Express;
    public hooks: Map<string, Hook>;
    public plugins: Map<string, Plugin>;

    constructor(port: number) {
        this.hooks = loadHooks();

        this.app = express();
        this.app.use(
            express.raw({ inflate: true, limit: "50mb", type: "multipart/form-data" })
        );
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        this.plugins = loadPlugins(this.app, this.hooks);

        this.app.get("/", (req, res) => {
            res.status(200).send({ code: 0, message: "[BetterAnixart Proxy] Instance has been ready!", info: {
                version: BAPROXY_VERSION,
            }})
        });

        this.app.get("/*", async (req, res) => {
            try {
                const url: URL = new URL(`${ANIXART_API_URL}${req.url}`);
                if (req.headers['api-version'] == "v2") {
                    DEFAULT_ANIXART_HEADERS["Api-Version"] = "v2";
                }

                const anixartResponse = await fetch(url, {
                    headers: DEFAULT_ANIXART_HEADERS
                });

                const origResponse = await anixartResponse.json()
                    .catch(e => {
                        logger.error(`${e.stack}`);
                        res.status(500).send({ code: 500, message: "Unexpected error!", error: e });
                    });


                let modifiedData: object = origResponse;

                for (const [key, hook] of this.hooks) {
                    if (hook.method === "GET" && hook.matchUrl(url)) {
                        modifiedData = await hook.modifyResponse(modifiedData, url, logger);
                    }
                }

                res.send(modifiedData);
            } catch (err: any) {
                logger.error(`${err.stack}`);
                res.status(500).send({ code: 500, message: "Unexpected error!", error: err });
            }
        })


        this.app.post("/*", async (req, res) => {
            try {
                let anixHeaders: ANIXART_HEADERS = DEFAULT_ANIXART_HEADERS;

                if (req.headers['api-version'] == "v2") {
                    anixHeaders["Api-Version"] = "v2";
                }

                const reqContentType = req.headers["content-type"] ?
                    req.headers["content-type"].split(";")[0] :
                    DEFAULT_ANIXART_HEADERS["Content-Type"];

                anixHeaders["Content-Type"] = reqContentType;

                let requestParams: RequestInit = {
                    method: "POST",
                    headers: anixHeaders,
                };

                switch (reqContentType.toLowerCase()) {
                    case "application/json":
                        requestParams.body = JSON.stringify(req.body);
                        break;

                    case "multipart/form-data":
                        requestParams.body = req.body;
                        break;

                    case "application/x-www-form-urlencoded":
                        requestParams.body = new URLSearchParams(req.body);
                        break;
                }

                const anixartResponse = await fetch(`${ANIXART_API_URL}${req.url}`, requestParams);

                anixartResponse.json()
                    .then(r => {
                        res.setHeader("Content-Type", "appication/json");
                        res.send(r);
                    })
                    .catch(e => {
                        logger.error(`${e.stack}`);
                        res.status(500).send({ code: 500, message: "Unexpected error!", error: e });
                    });
            } catch (err: any) {
                logger.error(`${err.stack}`);
                res.status(500).send({ code: 500, message: "Unexpected error!", error: err });
            }
        });

        this.app.listen(port, (e) => {
            console.clear();
            console.log(ASCII_ART);
            console.log(`\tBetterAnixart Proxy v${BAPROXY_VERSION}\n\tby DesConnet\n\n\t(https://github.com/BetterAnixart/BAProxy)\n`);
            logger.info(`Server has been started on port ${port}!`);
            logger.info(`Your instance url: ${INSTANCE_API_URL}`);
        })
    }
}


const server = new AnixartServer(SERVER_PORT);


