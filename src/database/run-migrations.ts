import 'dotenv/config';
import mongoose from 'mongoose';
import { migrationId, up as createInitialIndexes } from './migrations/001-payment-collections';

async function runMigrations(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI must be configured');
  await mongoose.connect(uri, { autoIndex: false });
  try {
    const hello = await mongoose.connection.db!.admin().command({ hello: 1 });
    if (!hello.setName) throw new Error('MongoDB replica set is required for payment transactions');

    const db = mongoose.connection.db!;
    const migrations = db.collection<{ _id: string; appliedAt: Date }>('schema_migrations');
    const appliedVersion = await migrations.findOne({ _id: migrationId });
    if (appliedVersion) {
      console.info(`Migration ${migrationId} is already applied`);
      return;
    }

    const existingCollections = await db.listCollections({}, { nameOnly: true }).toArray();
    const unrelated = existingCollections
      .map((collection) => collection.name)
      .filter((name) => name !== 'schema_migrations' && name !== 'system.views');
    if (unrelated.length > 0) {
      throw new Error(
        `This first migration expects a fresh payment database; found existing collections: ${unrelated.join(', ')}. Back up and migrate existing data deliberately before retrying.`,
      );
    }

    await createInitialIndexes();
    try {
      await migrations.insertOne({ _id: migrationId, appliedAt: new Date() });
    } catch (error) {
      await migrations.deleteOne({ _id: migrationId });
      throw error;
    }
    console.info(`Migration ${migrationId} completed`);
  } finally {
    await mongoose.disconnect();
  }
}

void runMigrations().catch((error: unknown) => {
  console.error('Database migration failed:', error);
  process.exitCode = 1;
});