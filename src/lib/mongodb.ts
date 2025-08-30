// lib/mongodb.ts
import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI!;
if (!uri) throw new Error("Defina MONGODB_URI nas variáveis de ambiente.");

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// cache global para evitar abrir várias conexões em dev/serverless
const g = global as unknown as { _mongoClientPromise?: Promise<MongoClient> };

if (!g._mongoClientPromise) {
  client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
  });
  g._mongoClientPromise = client.connect();
}
clientPromise = g._mongoClientPromise!;

export async function getDb() {
  const c = await clientPromise;
  return c.db(process.env.MONGODB_DB || "esp32");
}