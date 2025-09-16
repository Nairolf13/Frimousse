const redisCache = require('../lib/redisCache');

describe('redisCache basic no-redis behavior', () => {
  test('get/set/del are safe without REDIS_URL', async () => {
    // Assuming REDIS_URL is not set in CI/local by default here
    const key = 'test:no-redis:key';
    await expect(redisCache.get(key)).resolves.toBeNull();
    await expect(redisCache.set(key, { a: 1 }, 1000)).resolves.toBeUndefined();
    await expect(redisCache.del(key)).resolves.toBeUndefined();
    await expect(redisCache.delByPrefix('test:no-redis')).resolves.toBeUndefined();
  });
});
