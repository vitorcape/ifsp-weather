// src/lib/mongodb.ts
import { MongoClient, ServerApiVersion } from "mongodb";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Defina MONGODB_URI nas variáveis de ambiente (Vercel: Settings → Environment Variables)."
    );
  }
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, {
      serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
    });
    global._mongoClientPromise = client.connect();
  }
  return global._mongoClientPromise;
}

export async function getDb() {
  const client = await getClientPromise();
  const dbName = process.env.MONGODB_DB || "esp32";
  return client.db(dbName);
}