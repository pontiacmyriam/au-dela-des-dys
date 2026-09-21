const Stripe = require("stripe");

function createHandler(stripeClient) {
  return async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store, private");

    if (req.method !== "GET") return res.status(405).json({ error: "Méthode non autorisée" });

    const sessionId = typeof req.query?.session_id === "string" ? req.query.session_id : "";
    if (!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId)) {
      return res.status(400).json({ active: false, error: "Session invalide" });
    }

    try {
      const session = await stripeClient.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription", "line_items.data.price"],
      });
      const subscription = session.subscription;
      const expectedPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
      const purchasedExpectedPrice = Boolean(
        expectedPriceId &&
        session.line_items?.data?.some((item) => item.price?.id === expectedPriceId)
      );
      const active = Boolean(
        session.mode === "subscription" &&
        session.status === "complete" &&
        session.payment_status === "paid" &&
        purchasedExpectedPrice &&
        subscription &&
        ["active", "trialing"].includes(subscription.status)
      );

      return res.status(200).json({ active });
    } catch (error) {
      console.error("Subscription status error", error);
      return res.status(400).json({ active: false, error: "Vérification impossible" });
    }
  };
}

module.exports = function handler(req, res) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return createHandler(stripe)(req, res);
};
module.exports.createHandler = createHandler;
