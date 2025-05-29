// migrate.js
const { Firestore } = require('@google-cloud/firestore');
const { CosmosClient } = require('@azure/cosmos');

const firestore = new Firestore();
const cosmos = new CosmosClient(process.env.COSMOS_CONN);
const userContainer = cosmos.database('GlobalFlame').container('users');
const txContainer   = cosmos.database('GlobalFlame').container('transactions');

async function migrate(col, container) {
  const snap = await firestore.collection(col).get();
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  for (let item of items) {
    await container.items.upsert(item);
  }
  console.log(`Migrated ${items.length} documents from '${col}'`);
}

(async () => {
  await migrate('users', userContainer);
  await migrate('transactions', txContainer);
  console.log('✅ Migration complete');
})();
