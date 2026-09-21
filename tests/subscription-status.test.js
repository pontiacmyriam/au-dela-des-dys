const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { createHandler } = require("../api/subscription-status");

function setup(sessionOrError) {
  const calls = [];
  const stripeClient = {
    checkout: {
      sessions: {
        retrieve: async (...args) => {
          calls.push(args);
          if (sessionOrError instanceof Error) throw sessionOrError;
          return sessionOrError;
        },
      },
    },
  };
  const res = {
    headers: {}, statusCode: null, payload: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
  return { handler: createHandler(stripeClient), calls, res };
}

const validSession = () => ({
  mode: "subscription",
  status: "complete",
  payment_status: "paid",
  subscription: { status: "active" },
  line_items: { data: [{ price: { id: "price_premium" } }] },
});

describe("GET /api/subscription-status", () => {
  it("refuse les autres méthodes et désactive le cache", async () => {
    const { handler, calls, res } = setup(validSession());
    await handler({ method: "POST", query: {} }, res);
    assert.equal(res.statusCode, 405);
    assert.equal(res.headers["Cache-Control"], "no-store, private");
    assert.equal(calls.length, 0);
  });

  it("refuse un identifiant invalide avant tout appel Stripe", async () => {
    const { handler, calls, res } = setup(validSession());
    await handler({ method: "GET", query: { session_id: "invalid" } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.payload.active, false);
    assert.equal(calls.length, 0);
  });

  it("autorise uniquement une session Premium terminée et payée", async () => {
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID = "price_premium";
    const { handler, calls, res } = setup(validSession());
    await handler({ method: "GET", query: { session_id: "cs_test_valid123" } }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.payload, { active: true });
    assert.deepEqual(calls[0], ["cs_test_valid123", {
      expand: ["subscription", "line_items.data.price"],
    }]);
  });

  for (const [label, override] of [
    ["session encore ouverte", { status: "open" }],
    ["paiement non réglé", { payment_status: "unpaid" }],
    ["prix différent", { line_items: { data: [{ price: { id: "price_other" } }] } }],
    ["abonnement résilié", { subscription: { status: "canceled" } }],
  ]) {
    it(`reste fermé si : ${label}`, async () => {
      process.env.NEXT_PUBLIC_STRIPE_PRICE_ID = "price_premium";
      const { handler, res } = setup({ ...validSession(), ...override });
      await handler({ method: "GET", query: { session_id: "cs_test_inactive123" } }, res);
      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.payload, { active: false });
    });
  }

  it("reste fermé lorsque Stripe ne peut pas vérifier", async () => {
    const originalError = console.error;
    console.error = () => {};
    try {
      const { handler, res } = setup(new Error("Stripe unavailable"));
      await handler({ method: "GET", query: { session_id: "cs_test_error123" } }, res);
      assert.equal(res.statusCode, 400);
      assert.equal(res.payload.active, false);
    } finally {
      console.error = originalError;
    }
  });
});
