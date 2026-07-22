import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: { cancel: jest.fn(), speak: jest.fn(), pause: jest.fn(), resume: jest.fn() },
  });
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ voyelles: [] }),
  }));
});

afterEach(() => {
  document.getElementById("google-analytics-script")?.remove();
  delete window.__auDelaDesDysGaConfigured;
  delete window.dataLayer;
  jest.restoreAllMocks();
});

test.each([
  ["Tout accepter", "accepted"],
  ["Refuser les non essentiels", "refused"],
])("enregistre le choix de cookies « %s »", async (buttonName, storedValue) => {
  render(<App />);

  expect(await screen.findByRole("heading", { name: "Vos préférences de cookies" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: buttonName }));

  await waitFor(() => {
    expect(localStorage.getItem("cookieConsent")).toBe(storedValue);
    expect(screen.queryByRole("heading", { name: "Vos préférences de cookies" })).not.toBeInTheDocument();
  });

  if (storedValue === "accepted") {
    expect(document.getElementById("google-analytics-script")).toHaveAttribute(
      "src",
      "https://www.googletagmanager.com/gtag/js?id=G-0XBCSQCE21"
    );
  } else {
    expect(document.getElementById("google-analytics-script")).not.toBeInTheDocument();
  }
});

test("personnalise et autorise explicitement Google Analytics", async () => {
  render(<App />);
  await screen.findByRole("heading", { name: "Vos préférences de cookies" });

  fireEvent.click(screen.getByRole("button", { name: "Personnaliser" }));
  expect(document.getElementById("google-analytics-script")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("checkbox", { name: /Mesure d’audience Google Analytics/ }));
  fireEvent.click(screen.getByRole("button", { name: "Enregistrer mes choix" }));

  await waitFor(() => {
    expect(localStorage.getItem("cookieConsent")).toBe("analytics-granted");
    expect(document.getElementById("google-analytics-script")).toBeInTheDocument();
  });
});

test("permet de rouvrir les préférences depuis le pied de page", async () => {
  localStorage.setItem("cookieConsent", "refused");
  localStorage.setItem("avatar", "girl");
  render(<App />);

  await waitFor(() => expect(screen.getByRole("button", { name: "Gérer mes cookies" })).toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: "Gérer mes cookies" }));

  expect(screen.getByRole("heading", { name: "Vos préférences de cookies" })).toBeInTheDocument();
});
