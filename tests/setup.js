// Jest setup file to handle cleanup
const keyStore = require('../src/store/keyStore');

afterAll(async () => {
  // Close Redis connection after all tests
  await keyStore.disconnect();
});
