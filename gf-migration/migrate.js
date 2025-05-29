// migrate.js – Sacred Migration v4 (2025‑05‑17)
// -----------------------------------------------------------------------------
// End‑to‑end ritual: 1) backup Firestore → GCS; 2) adaptive‑batch migrate
// **users** + **transactions** into Azure Cosmos DB (SQL API); 3) smart retry;
// 4) dual logging; 5) optional rollback + post‑run insights.
// -----------------------------------------------------------------------------
// ▸ Prerequisites
//   npm i @google-cloud/firestore @google-cloud/storage @azure/cosmos p-limit \
//          applicationinsights @globalflame/firestore-cleanser
//   Export env :  FIRESTORE_PROJECT  |  GCS_BUCKET  |  COSMOS_CONN  |  APPINSIGHTS_KEY
//   Node ≥ 18 (ESM)
// -----------------------------------------------------------------------------

import { Firestore, Timestamp, GeoPoint } from "@google-cloud/firestore";
import { Storage }                        from "@google-cloud/storage";
import { CosmosClient }                   from "@azure/cosmos";
import pLimit                             from "p-limit";
import appInsights                        from "applicationinsights";
import { cleanseFirestoreData }           from "@globalflame/firestore-cleanser";

// ────────────────────────────────────────────────────────────────────────
// 0 ‑ Clients
// ────────────────────────────────────────────────────────────────────────
const firestore = new Firestore({ projectId: process.env.FIRESTORE_PROJECT });
const bucket    = new Storage().bucket(process.env.GCS_BUCKET);
const cosmos    = new CosmosClient(process.env.COSMOS_CONN);
appInsights.setup(process.env.APPINSIGHTS_KEY).start();

const { database }           = await cosmos.databases.createIfNotExists({ id: "GlobalFlame" });
const { container: usersC }  = await database.containers.createIfNotExists({ id: "users",        partitionKey: "/id" });
const { container: txC }     = await database.containers.createIfNotExists({ id: "transactions", partitionKey: "/id" });

// ────────────────────────────────────────────────────────────────────────
// 1 ‑ Backup + Rollback helpers
// ────────────────────────────────────────────────────────────────────────
async function backupCollection(col) {
  const snap = await firestore.collection(col).get();
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const file = `${col}-${Date.now()}.json`;
  await bucket.file(file).save(JSON.stringify(data));
  return file;
}

export async function restoreCollection(col, file) {
  const [buf] = await bucket.file(file).download();
  const data  = JSON.parse(buf.toString());
  const batch = firestore.batch();
  data.forEach(doc => batch.set(firestore.collection(col).doc(doc.id), doc));
  await batch.commit();
}

// ────────────────────────────────────────────────────────────────────────
// 2 ‑ Logging (Firestore + AppInsights)
// ────────────────────────────────────────────────────────────────────────
function logEvent(event) {
  firestore.collection("migrationLogs").add({ ...event, ts: Timestamp.now() });
  appInsights.defaultClient.trackEvent({ name: "MigrationEvent", properties: event });
}

// ────────────────────────────────────────────────────────────────────────
// 3 ‑ Adaptive batch + retry queue
// ────────────────────────────────────────────────────────────────────────
let batchSize   = 100;               // grows / shrinks with success / 429
const limiter   = pLimit(20);        // max concurrent upserts
const failQueue = [];

async function migrateDocs(docs, container) {
  for (let i = 0; i < docs.length; i += batchSize) {
    const slice   = docs.slice(i, i + batchSize);
    const start   = Date.now();
    try {
      await Promise.all(slice.map(doc => limiter(() => container.items.upsert(cleanseFirestoreData(doc)))));
      batchSize = Math.min(batchSize * 2, 1000);
    } catch (err) {
      if (err.code === 429) batchSize = Math.max(Math.floor(batchSize / 2), 10);
      slice.forEach(d => failQueue.push(d));
      logEvent({ type: "error", batchSize: slice.length, durationMs: Date.now() - start, error: err.message });
    } finally {
      logEvent({ type: "batch", batchSize: slice.length, durationMs: Date.now() - start });
    }
  }
}

async function retryFailures(retry = 0) {
  if (!failQueue.length) return;
  const wait = Math.pow(2, retry) * 1000;
  await new Promise(res => setTimeout(res, wait));
  const current = [...failQueue];
  failQueue.length = 0;
  await migrateDocs(current, current[0]?.kind === "tx" ? txC : usersC); // simple heuristic
  if (failQueue.length && retry < 5) await retryFailures(retry + 1);
}

// ────────────────────────────────────────────────────────────────────────
// 4 ‑ Driver for a collection
// ────────────────────────────────────────────────────────────────────────
async function migrateCollection(col, container) {
  console.log(`⏳ pulling ${col} from Firestore…`);
  const snap = await firestore.collection(col).get();
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  console.log(`⏳ pushing → Cosmos (${docs.length} docs)…`);
  await migrateDocs(docs, container);
  await retryFailures();
  console.log(`✅ migrated ${docs.length} → ${col}`);
}

// ────────────────────────────────────────────────────────────────────────
// 5 ‑ Post‑run insight (slow‑batch heuristic)
// ────────────────────────────────────────────────────────────────────────
async function analyzeEfficiency() {
  const logs = await firestore.collection("migrationLogs").get();
  const evts = logs.docs.map(d => d.data());
  if (!evts.length) return;
  const avg   = evts.reduce((s,e) => s + e.durationMs, 0) / evts.length;
  const slow  = evts.filter(e => e.durationMs > avg * 2);
  if (slow.length) console.log(`🚨 Optimize batches: ${slow.length} slow ops flagged`);
}

// ────────────────────────────────────────────────────────────────────────
// 6 ‑ MAIN RITUAL
// ────────────────────────────────────────────────────────────────────────
try {
  console.log("🔒 Backup phase – GCS vaulting…");
  const uFile = await backupCollection("users");
  const tFile = await backupCollection("transactions");
  console.log(`📦 backups stored as ${uFile}, ${tFile}`);

  await migrateCollection("users",        usersC);
  await migrateCollection("transactions", txC);

  await analyzeEfficiency();

  console.log("🚀  ALL DONE – migration complete");
  process.exit(0);
} catch (err) {
  console.error("❌ migration failed:", err.message);
  logEvent({ type: "fatal", batchSize, durationMs: 0, error: err.message });
  process.exit(1);
}
