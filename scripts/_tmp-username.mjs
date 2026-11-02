import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const uriDb = process.env.MONGODB_URI.split("/").pop().split("?")[0];
const db = client.db(uriDb || undefined);
const user = await db.collection("users").findOne(
  { username: { $exists: true, $nin: [null, ""] } },
  { projection: { username: 1, onboarding: 1, _id: 0 } }
);
console.log(JSON.stringify({ db: db.databaseName, username: user?.username ?? null, complete: Boolean(user?.onboarding) }));
await client.close();
