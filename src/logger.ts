export enum LOGGER_LEVEL {
    DISABLED = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    DEBUG = 4
};

export default class Logger {
    private readonly level: LOGGER_LEVEL;
    constructor (level: LOGGER_LEVEL = LOGGER_LEVEL.INFO) {
        this.level = level;
    }

    public info(msg: string) {
        if (this.level >= LOGGER_LEVEL.INFO) console.log(`[INFO] ${msg}`);
    }

    public error(msg: string) {
        if (this.level >= LOGGER_LEVEL.ERROR) console.log(`[ERROR] ${msg}`);
    }

    public debug(msg: string) {
        if (this.level >= LOGGER_LEVEL.DEBUG) console.log(`[DEBUG] ${msg}`);
    }

    public warn(msg: string) {
        if (this.level >= LOGGER_LEVEL.WARN) console.log(`[WARN] ${msg}`);
    }
}