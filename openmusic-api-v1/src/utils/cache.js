const redis = require('redis');

class CacheService {
  constructor() {
    this._client = redis.createClient({
      host: process.env.REDIS_SERVER || 'localhost',
      port: 6379,
    });

    this._client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this._client.on('connect', () => {
      console.log('Connected to Redis server');
    });
  }

  async connect() {
    await this._client.connect();
  }

  async set(key, value, ttlInSeconds = 1800) { // default 30 minutes
    await this._client.setEx(key, ttlInSeconds, JSON.stringify(value));
  }

  async get(key) {
    const result = await this._client.get(key);
    if (!result) {
      return null;
    }
    return JSON.parse(result);
  }

  async del(key) {
    await this._client.del(key);
  }

  async delPattern(pattern) {
    const keys = await this._client.keys(pattern);
    if (keys.length > 0) {
      await this._client.del(keys);
    }
  }

  async disconnect() {
    await this._client.disconnect();
  }
}

module.exports = CacheService;