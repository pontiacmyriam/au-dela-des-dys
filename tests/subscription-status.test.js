const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHandler } = require('../api/subscription-status');

function mockRequest(session, method = 'GET', id = 'cs_test_example123') {
  let retrieved = 0;
  const stripe = { checkout: { sessions: { retrieve: async () => {
    retrieved += 1;
    if (session instanceof Error) throw session;
    return session;
  } } } };
  const res = {
    headers: {}, statusCode: 0, data: null,
    setHeader(key, val) { this.headers[key] = val; },
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; },
  };
  return { run: () => createHandler(stripe)({ method, query: { session_id: id } }, res),
    res, retrievalCount: () => retrieved };
}

const valid = () => ({
  mode: 'subscription', status: 'complete', payment_status: 'paid',
  subscription: { status: 'active' },
  line_items: { data: [{ price: { id: 'price_qa' } }] },
});

test('accepts a paid subscription with the configured price', async () => {
  process.env.NEXT_PUBLIC_STRIPE_PRICE_ID = 'price_qa';
  const ctx = mockRequest(valid());
  await ctx.run();
  assert.deepEqual(ctx.res.data, { active: true });
  assert.equal(ctx.res.headers['Cache-Control'], 'no-store, private');
});

for (const [name, change] of [
  ['open checkout', { status: 'open' }],
  ['unpaid checkout', { payment_status: 'unpaid' }],
  ['wrong price', { line_items: { data: [{ price: { id: 'price_other' } }] } }],
  ['cancelled subscription', { subscription: { status: 'canceled' } }],
  ['wrong mode', { mode: 'payment' }],
]) {
  test(`refuses ${name}`, async () => {
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID = 'price_qa';
    const ctx = mockRequest({ ...valid(), ...change });
    await ctx.run();
    assert.deepEqual(ctx.res.data, { active: false });
  });
}

test('rejects malformed identifiers without Stripe calls', async () => {
  const ctx = mockRequest(valid(), 'GET', 'invalid');
  await ctx.run();
  assert.equal(ctx.res.statusCode, 400);
  assert.equal(ctx.retrievalCount(), 0);
});

test('rejects non-GET requests without Stripe calls', async () => {
  const ctx = mockRequest(valid(), 'POST');
  await ctx.run();
  assert.equal(ctx.res.statusCode, 405);
  assert.equal(ctx.retrievalCount(), 0);
});

test('fails closed on API errors', async () => {
  const old = console.error;
  console.error = () => {};
  try {
    const ctx = mockRequest(new Error('Stripe is unavailable'));
    await ctx.run();
    assert.equal(ctx.res.data.active, false);
  } finally { console.error = old; }
});
