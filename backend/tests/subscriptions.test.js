const subs = require('../routes/subscriptions');

describe('subscriptions module smoke', () => {
	test('module loads', () => {
		expect(typeof subs).toBe('function' );
	});
});
