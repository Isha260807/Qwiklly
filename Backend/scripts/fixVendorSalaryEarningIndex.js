const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/Homster';
const indexName = 'vendorId_1_bookingId_1';

async function fixVendorSalaryEarningIndex() {
  await mongoose.connect(mongoUri);

  const collection = mongoose.connection.collection('vendorsalaryearnings');
  const indexes = await collection.listIndexes().toArray();
  const existingIndex = indexes.find((index) => index.name === indexName);

  if (existingIndex) {
    await collection.dropIndex(indexName);
    console.log(`Dropped legacy ${indexName} index.`);
  }

  await collection.createIndex(
    { vendorId: 1, bookingId: 1 },
    {
      name: indexName,
      unique: true,
      partialFilterExpression: { bookingId: { $type: 'objectId' } },
    }
  );

  console.log('Created booking-only unique index for vendorsalaryearnings.');
}

fixVendorSalaryEarningIndex()
  .catch((error) => {
    console.error('Could not fix VendorSalaryEarning index:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
