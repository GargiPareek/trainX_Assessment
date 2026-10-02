import { OnApplicationBootstrap } from '@nestjs/common';
import { Connection } from 'mongoose';
export declare class MongoReplicaSetHealth implements OnApplicationBootstrap {
    private readonly connection;
    private readonly logger;
    constructor(connection: Connection);
    onApplicationBootstrap(): Promise<void>;
}
