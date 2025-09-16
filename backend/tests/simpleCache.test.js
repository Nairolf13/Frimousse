const simpleCache = require('../lib/simpleCache');

describe('simpleCache', () => {
  afterEach(() => {
    simpleCache.clear();
  });

  test('set and get and delByPrefix', () => {
    simpleCache.set('/api/foo|center:1|anon', { x: 1 }, 10000);
    simpleCache.set('/api/foo|center:1|anon?c=1', { x: 2 }, 10000);
    simpleCache.set('/api/foo|anon', { x: 3 }, 10000);
    expect(simpleCache.get('/api/foo|center:1|anon')).toEqual({ x: 1 });
    simpleCache.delByPrefix('/api/foo|center:1');
    expect(simpleCache.get('/api/foo|center:1|anon')).toBeUndefined();
    expect(simpleCache.get('/api/foo|anon')).toEqual({ x: 3 });
    simpleCache.delByPrefix('/api/foo|anon');
    expect(simpleCache.get('/api/foo|anon')).toBeUndefined();
  });
});
