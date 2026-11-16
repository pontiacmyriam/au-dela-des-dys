const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function checkoutBaseUrl() {
  if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL &&
      /^[a-z0-9.-]+\.vercel\.app$/i.test(process.env.VERCEL_URL)) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'https://www.audeladesdys.fr';
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  if (!req.body || req.body.legalConsent !== true) {
    return res.status(400).json({ error: "L’acceptation des CGV et de la politique de confidentialité est obligatoire." });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${checkoutBaseUrl()}/?paiement=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${checkoutBaseUrl()}/?paiement=cancel`,
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Erreur Stripe:", error);
    res.status(500).json({ error: "Erreur création session Stripe" });
  }
};

module.exports.checkoutBaseUrl = checkoutBaseUrl;
