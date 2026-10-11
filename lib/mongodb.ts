import { attachDatabasePool } from "@vercel/functions";
import { MongoClient, type MongoClientOptions } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Please add your MongoDB URI to .env.local");
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

/**
 * Sized for an Atlas M0 cluster (500 connections shared by every Vercel instance). Each instance can open
 * up to (maxPoolSize + 2 monitoring) x 3 members = 21 connections.
 */
const options: MongoClientOptions = {
  appName: "bridalync",
  // Fluid compute shares an instance between concurrent requests; queries are short OLTP lookups.
  maxPoolSize: 5,
  minPoolSize: 0,
  // Close idle connections quickly; attachDatabasePool keeps the instance alive until they are released.
  maxIdleTimeMS: 10_000,
  // Long enough to ride out an Atlas primary election (usually < 12s), short enough that users aren't left waiting 30s.
  serverSelectionTimeoutMS: 15_000,
  connectTimeoutMS: 10_000,
  socketTimeoutMS: 30_000,
};

/**
 * Connects lazily and caches the client on `globalThis` (survives HMR in dev and duplicate module copies in
 * production bundles). A failed connect is not cached, so the next call retries instead of the warm
 * serverless instance rejecting every request until it is recycled.
 */
export function getMongoClient(): Promise<MongoClient> {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri!, options);
    attachDatabasePool(client);
    const promise = client.connect();
    global._mongoClientPromise = promise;
    promise.catch(() => {
      if (global._mongoClientPromise === promise) {
        global._mongoClientPromise = undefined;
      }
      client.close().catch(() => {});
    });
  }
  return global._mongoClientPromise;
}
