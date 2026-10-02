"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mongoose_1 = __importDefault(require("mongoose"));
const _001_payment_collections_1 = require("./migrations/001-payment-collections");
async function runMigrations() {
    const uri = process.env.MONGODB_URI;
    if (!uri)
        throw new Error('MONGODB_URI must be configured');
    await mongoose_1.default.connect(uri, { autoIndex: false });
    try {
        const hello = await mongoose_1.default.connection.db.admin().command({ hello: 1 });
        if (!hello.setName)
            throw new Error('MongoDB replica set is required for payment transactions');
        const db = mongoose_1.default.connection.db;
        const migrations = db.collection('schema_migrations');
        const appliedVersion = await migrations.findOne({ _id: _001_payment_collections_1.migrationId });
        if (appliedVersion) {
            console.info(`Migration ${_001_payment_collections_1.migrationId} is already applied`);
            return;
        }
        const existingCollections = await db.listCollections({}, { nameOnly: true }).toArray();
        const unrelated = existingCollections
            .map((collection) => collection.name)
            .filter((name) => name !== 'schema_migrations' && name !== 'system.views');
        if (unrelated.length > 0) {
            throw new Error(`This first migration expects a fresh payment database; found existing collections: ${unrelated.join(', ')}. Back up and migrate existing data deliberately before retrying.`);
        }
        await (0, _001_payment_collections_1.up)();
        try {
            await migrations.insertOne({ _id: _001_payment_collections_1.migrationId, appliedAt: new Date() });
        }
        catch (error) {
            await migrations.deleteOne({ _id: _001_payment_collections_1.migrationId });
            throw error;
        }
        console.info(`Migration ${_001_payment_collections_1.migrationId} completed`);
    }
    finally {
        await mongoose_1.default.disconnect();
    }
}
void runMigrations().catch((error) => {
    console.error('Database migration failed:', error);
    process.exitCode = 1;
});
//# sourceMappingURL=run-migrations.js.map