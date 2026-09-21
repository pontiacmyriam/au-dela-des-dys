const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Méthode non autorisée" });

  const sessionId = typeof req.query?.session_id === "string" ? req.query.session_id : "";
  if (!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId)) {
    return res.status(400).json({ active: false, error: "Session invalide" });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });
    const subscription = session.subscription;
    const active = Boolean(
      session.payment_status === "paid" &&
      subscription &&
      ["active", "trialing"].includes(subscription.status)
    );

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ active });
  } catch (error) {
    console.error("Subscription status error", error);
    return res.status(400).json({ active: false, error: "Vérification impossible" });
  }
};
