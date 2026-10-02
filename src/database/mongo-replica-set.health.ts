import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class MongoReplicaSetHealth implements OnApplicationBootstrap {
  private readonly logger = new Logger(MongoReplicaSetHealth.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async onApplicationBootstrap(): Promise<void> {
    const hello = await this.connection.db!.admin().command({ hello: 1 });
    if (!hello.setName) {
      throw new Error('MongoDB replica set is required: payment and webhook flows use multi-document transactions');
    }
    this.logger.log(`Connected to MongoDB replica set ${hello.setName}`);
  }
}