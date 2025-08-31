// src/lib/mongodb.ts
import { MongoClient, ServerApiVersion } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGODB_URI!;
if (!uri) throw new Error("Defina MONGODB_URI nas variáveis de ambiente.");

const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

// cache global p/ dev/serverless
const clientPromise: Promise<MongoClient> =
  global._mongoClientPromise ?? client.connect();

if (!global._mongoClientPromise) {
  global._mongoClientPromise = clientPromise;
}

export async function getDb() {
  const c = await clientPromise;
  return c.db(process.env.MONGODB_DB || "esp32");
}