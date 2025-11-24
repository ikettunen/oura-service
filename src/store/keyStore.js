const Redis = require('ioredis');
const fs = require('fs').promises;
const path = require('path');

const memory = new Map();
let redis = null;

// File-based storage for development
const STORAGE_FILE = path.join(__dirname, '../../data/oura-keys.json');

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 2 });
}

// Initialize file storage
async function initFileStorage() {
  try {
    const dir = path.dirname(STORAGE_FILE);
    await fs.mkdir(dir, { recursive: true });
    
    // Try to load existing data
    try {
      const data = await fs.readFile(STORAGE_FILE, 'utf8');
      const keys = JSON.parse(data);
      for (const [key, value] of Object.entries(keys)) {
        memory.set(key, value);
      }
    } catch (err) {
      // File doesn't exist yet, that's ok
      await fs.writeFile(STORAGE_FILE, '{}', 'utf8');
    }
  } catch (err) {
    console.error('Failed to initialize file storage:', err);
  }
}

// Save to file
async function saveToFile() {
  if (redis) return; // Don't save to file if using Redis
  
  try {
    const data = Object.fromEntries(memory);
    await fs.writeFile(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save to file:', err);
  }
}

async function get(key) {
  if (redis) return await redis.get(key);
  return memory.get(key) || null;
}

async function set(key, value) {
  if (redis) return await redis.set(key, value);
  memory.set(key, value);
  await saveToFile();
}

async function del(key) {
  if (redis) return await redis.del(key);
  memory.delete(key);
  await saveToFile();
}

async function disconnect() {
  if (redis) {
    await redis.quit();
  }
}

// Initialize on module load
initFileStorage();

module.exports = { get, set, del, disconnect };
