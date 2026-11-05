"use client";

import Script from "next/script";
import Link from "next/link";
import { useEffect, useState } from "react";

declare global {
  interface Window {
    BasketballPromo?: { open: () => Promise<boolean | void>; close: () => void; destroy: () => void };
  }
}

export default function Demo() {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("");
  useEffect(() => {
    function error(event: Event) {
      if (event instanceof CustomEvent && typeof event.detail?.message === "string") setStatus(event.detail.message);
    }
    window.addEventListener("basketball-promo:error", error);
    return () => window.removeEventListener("basketball-promo:error", error);
  }, []);
  async function open() {
    setStatus("");
    try {
      if (!window.BasketballPromo) throw new Error("Le module n'est pas encore disponible.");
      await window.BasketballPromo.open();
    } catch (error) {
      console.error("[Court Club] Ouverture impossible.", error);
      setStatus("Le jeu est indisponible. Vérifiez les origines autorisées et la console.");
    }
  }
  return (
    <>
      <Script src="/embed.js" data-shop="demo" strategy="afterInteractive"
        onReady={() => setReady(true)}
        onError={() => setStatus("Le script du jeu n'a pas pu se charger.")} />
      <div className="demo-wrap">
        <header className="demo-nav">
          <Link className="demo-logo" href="/">court club<span className="brand-dot" aria-hidden="true">●</span></Link>
          <div className="demo-nav-right"><a href="#integration">L&apos;intégration</a><span className="pill">DÉMO INTERACTIVE</span></div>
        </header>
        <main>
          <section className="demo-hero">
            <div className="hero-copy">
              <div className="demo-kicker">LE JEU QUI CHANGE LA DONNE</div>
              <h1>Moins de formulaires.<br />Plus de <em>paniers.</em></h1>
              <p>Offrez à vos visiteurs une pause ludique. Trois paniers marqués, un code promo gagné. Le plaisir de jouer, sans laisser son e-mail.</p>
              <div className="hero-actions">
                <button className="primary" disabled={!ready} onClick={open}>Tester le mini-jeu <span aria-hidden="true">↗</span></button>
                <a className="secondary" href="#integration">Voir l&apos;intégration <span aria-hidden="true">↓</span></a>
              </div>
              <div className="hero-note"><span>✓ Sans inscription</span><span>✓ Mobile & desktop</span><span>✓ À votre image</span></div>
              <p className="demo-status" role="status">{status}</p>
            </div>
            <div className="demo-art" aria-hidden="true">
              <span className="demo-art-label">LA VICTOIRE EST DANS VOTRE CAMP.</span>
              <div className="hero-ball"><i /></div>
              <div className="hero-reward"><span>3 PANIERS =</span><strong>-10 %</strong><small>Un exemple de récompense.</small></div>
              <span className="art-caption">Un petit shoot. Un grand sourire.</span>
            </div>
          </section>
          <section className="demo-benefits" aria-label="Comment ça marche">
            {[
              ["01", "Une invitation, pas une obligation.", "Une popup à l'ouverture. Vos visiteurs jouent ou ferment, tout simplement."],
              ["02", "Trois paniers. Zéro formulaire.", "Un jeu accessible, des essais illimités. Du premier tir à la victoire."],
              ["03", "Le code, tout de suite.", "La récompense se copie en un clic. Il ne reste qu'à continuer ses achats."],
            ].map(([number, title, text]) => <div className="demo-benefit" key={number}><span className="benefit-number">{number}</span><div><h2>{title}</h2><p>{text}</p></div></div>)}
          </section>
          <section className="integration" id="integration">
            <div><span className="eyebrow">PENSÉ POUR VOS BOUTIQUES</span><h2>Un script. Et c&apos;est parti.</h2><p>Shopify, WooCommerce ou site sur mesure : le jeu vit dans son iframe et laisse votre boutique tranquille. Configurez vos couleurs, vos textes et un code promo existant.</p><p>Cette page n&apos;est pas une boutique : elle présente le module. La popup automatique ne s&apos;affiche qu&apos;une fois par session. Le bouton permet de la rouvrir volontairement.</p></div>
            <div className="code-block"><div className="code-top"><span>À placer dans votre boutique</span><span>HTML</span></div><pre><code>{`<script\n  src="https://jeu.votre-domaine.fr/embed.js"\n  data-shop="demo"\n  data-name="Ma boutique"\n  data-accent="#a3421c"\n  data-background="#fff9f0"\n  data-code="PANIER10"\n  data-terms="-10 % dès 50 € d'achat."\n  data-expires-at="2026-12-31T22:59:59Z"\n  defer>\n</script>`}</code></pre></div>
          </section>
        </main>
        <footer className="demo-footer"><span>court club · Le plaisir avant le formulaire.</span><span>Aucun e-mail collecté. Aucun traceur tiers ajouté.</span></footer>
      </div>
    </>
  );
}
