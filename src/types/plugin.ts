import { Express } from 'express';
import Logger from '../logger';

export interface Plugin {
    name: string;
    description?: string;
    version: string;
    author?: string;
    init(app: Express, logger: Logger): void;
}