import { DataStore } from '../database/store';
export declare function createApiServer(store: DataStore, getStatus: () => any, port: number, host: string): {
    start: () => void;
    stop: () => void;
};
