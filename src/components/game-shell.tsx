"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { ShopConfig } from "@/lib/shops";
import { isHostMessage, PROTOCOL } from "@/lib/protocol";
import BasketballGame from "./basketball-game";
import { offerExpired, type PromoOptions } from "@/lib/promo-options";

export default function GameShell({ shop, parentOrigin, channel }: {
  shop: ShopConfig; parentOrigin: string; channel: string;
}) {
  const [phase, setPhase] = useState<"intro" | "playing" | "won">("intro");
  const [connected, setConnected] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const rootRef = useRef<HTMLElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);
  const [options, setOptions] = useState<PromoOptions>({});
  const promotion = { ...shop, ...options };
  const expiryRef = useRef<string | undefined>(undefined);
  const send = useCallback((type: "ready" | "completed" | "close" | "focus-close") => {
    window.parent.postMessage({ protocol: PROTOCOL, channel, type }, parentOrigin);
  }, [channel, parentOrigin]);

  useEffect(() => {
    function controls() {
      return Array.from(rootRef.current?.querySelectorAll<HTMLElement>("a[href], button:not(:disabled), input:not(:disabled), summary") ?? [])
        .filter((element) => element.getClientRects().length > 0);
    }
    function message(event: MessageEvent<unknown>) {
      if (event.origin !== parentOrigin || event.source !== window.parent || !isHostMessage(event.data, channel)) return;
      if (event.data.type === "init" && !initializedRef.current) {
        const received = event.data.options ?? {};
        expiryRef.current = received.expiresAt;
        if (offerExpired(received.expiresAt)) { send("close"); return; }
        initializedRef.current = true;
        setOptions(received);
        setConnected(true);
        if (event.data.completed) setPhase("won");
      }
      if (event.data.type === "focus") {
        const elements = controls();
        (event.data.edge === "first" ? elements[0] : elements.at(-1))?.focus();
      }
    }
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); send("close"); }
      if (event.key !== "Tab") return;
      const elements = controls();
      if ((event.shiftKey && document.activeElement === elements[0]) ||
          (!event.shiftKey && document.activeElement === elements.at(-1))) {
        event.preventDefault(); send("focus-close");
      }
    }
    window.addEventListener("message", message);
    document.addEventListener("keydown", keydown);
    send("ready");
    return () => {
      window.removeEventListener("message", message);
      document.removeEventListener("keydown", keydown);
    };
  }, [channel, parentOrigin, send]);

  useEffect(() => {
    if (connected) rootRef.current?.querySelector<HTMLElement>("[data-phase-focus]")?.focus();
  }, [phase, connected]);

  useEffect(() => {
    if (!options.expiresAt) return;
    const timer = setInterval(() => {
      if (offerExpired(options.expiresAt)) send("close");
    }, 500);
    return () => clearInterval(timer);
  }, [options.expiresAt, send]);

  function win() {
    if (offerExpired(expiryRef.current)) { send("close"); return; }
    setPhase("won"); send("completed");
  }
  async function copy() {
    if (offerExpired(expiryRef.current)) { send("close"); return; }
    try {
      if (!navigator.clipboard) throw new Error("Presse-papiers indisponible.");
      await navigator.clipboard.writeText(promotion.code);
      setCopyStatus("Code copié ! À vous de jouer dans votre panier.");
    } catch (error) {
      console.warn("[Basketball Promo] Copie impossible.", error);
      setCopyStatus("Copie automatique indisponible. Le code est sélectionné : copiez-le manuellement.");
      codeRef.current?.focus();
      codeRef.current?.select();
    }
  }
  const style: CSSProperties & { "--accent": string; "--paper": string } = { "--accent": promotion.accent, "--paper": promotion.background };
  return (
    <main className={`game-shell phase-${phase}`} style={style} ref={rootRef}>
      <div className="frame-brand">
        <div className="frame-identity">
        {shop.logoUrl ?
          /* Remote shop logos intentionally use native images, without Next's host allowlist. */
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shop.logoUrl} alt={promotion.name} width="100" height="32" /> :
          <span className="frame-name">{promotion.name}<span className="brand-dot" aria-hidden="true">●</span></span>}
          <small className="powered-by">powered by <a href="https://www.instagram.com/webcaliskan/" target="_blank" rel="noopener noreferrer">webcaliskan</a></small>
        </div>
        <span className="eyebrow">PLAY & WIN</span>
      </div>
      {phase === "intro" && <>
        <div className="intro-art" aria-hidden="true"><div className="art-orbit" /><div className="art-ball"><i /></div><span className="art-ticket">VOTRE PROCHAIN<br />ACHAT, EN MIEUX.</span><span className="art-three">3</span></div>
        <p className="eyebrow">UNE PAUSE QUI RAPPORTE</p>
        <h1 data-phase-focus tabIndex={-1}>{shop.title}</h1>
        <p className="intro-description">{shop.description}</p>
        <div className="intro-tags"><span>3 paniers à marquer</span></div>
        <button className="primary full" disabled={!connected} onClick={() => setPhase("playing")}>{connected ? "C'est parti !" : "Connexion à la boutique…"} <span aria-hidden="true">↗</span></button>
        <button className="text-button" onClick={() => send("close")}>Une prochaine fois</button>
      </>}
      {phase === "playing" && <>
        <h1 className="play-title" data-phase-focus tabIndex={-1}>À vous de tirer.</h1>
        <p className="play-help">Glissez vers le bas, visez avec les pointillés, relâchez.</p>
        <BasketballGame accent={promotion.accent} onWin={win} />
      </>}
      {phase === "won" && <>
        <div className="victory-art" aria-hidden="true"><span>★</span><strong>3/3</strong><span>★</span></div>
        <p className="eyebrow">LE SANS-FAUTE</p>
        <h1 data-phase-focus tabIndex={-1}>{shop.victoryTitle}</h1>
        <p className="intro-description">Trois paniers, une récompense. Votre code est prêt.</p>
        <div className="coupon"><label htmlFor="promo-code">VOTRE CODE PROMO</label><input id="promo-code" ref={codeRef} value={promotion.code} readOnly spellCheck={false} /></div>
        <p className="terms">{promotion.terms}
          {options.expiresAt && <><br /><span>Valable jusqu&apos;au {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(options.expiresAt))} (heure de Paris).</span></>}
        </p>
        <button className="primary full" onClick={copy}>Copier le code <span aria-hidden="true">⧉</span></button>
        <p className="copy-status" role="status">{copyStatus}</p>
        <button className="secondary full" onClick={() => send("close")}>Continuer mes achats <span aria-hidden="true">→</span></button>
      </>}
    </main>
  );
}
