export type ShopConfig = {
  id: string;
  campaignId: string;
  name: string;
  allowedOrigins: string[];
  accent: string;
  background: string;
  logoUrl?: string;
  title: string;
  description: string;
  victoryTitle: string;
  code: string;
  terms: string;
  openDelayMs: number;
  frequency: "session" | "daily" | "always";
  completedDays: number;
};

function origins(value: string): string[] {
  return value.split(",").map((entry) => {
    const url = new URL(entry.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.origin !== entry.trim()) {
      throw new Error("Les origines autorisées doivent être des origines HTTP(S) exactes, sans chemin.");
    }
    return url.origin;
  });
}

const shops: Record<string, ShopConfig> = {
  demo: {
    id: "demo",
    campaignId: "welcome-v1",
    name: "Court Club",
    allowedOrigins: origins(process.env.DEMO_SHOP_ORIGINS ?? "http://localhost:3000,http://127.0.0.1:3000,http://127.0.0.1:3001,https://kebab-center.fr,https://www.kebab-center.fr"),
    accent: "#a3421c",
    background: "#fff9f0",
    title: "3 paniers. À vous la réduction.",
    description: "Un ballon, trois paniers et une petite surprise pour vos prochains achats.",
    victoryTitle: "Bien joué, champion !",
    code: "PANIER10",
    terms: "",
    openDelayMs: 1200,
    frequency: "session",
    completedDays: 90,
  },
  atelier: {
    id: "atelier",
    campaignId: "welcome-v1",
    name: "L'Atelier",
    allowedOrigins: origins(process.env.ATELIER_SHOP_ORIGINS ?? "http://localhost:3000"),
    accent: "#285c4f",
    background: "#f4faf4",
    title: "Marquez 3 paniers et gagnez un code promo !",
    description: "Prenez une petite pause. Votre prochaine commande vous dira merci.",
    victoryTitle: "Votre récompense vous attend",
    code: "ATELIER10",
    terms: "Code d'exemple à configurer dans votre plateforme e-commerce avant publication.",
    openDelayMs: 2000,
    frequency: "daily",
    completedDays: 90,
  },
};

for (const shop of Object.values(shops)) {
  if (!/^#[0-9a-f]{6}$/i.test(shop.accent) || !/^#[0-9a-f]{6}$/i.test(shop.background)) {
    throw new Error(`Couleurs invalides pour ${shop.id} : utiliser #RRGGBB.`);
  }
  if (!shop.code.trim() || !/^[a-zA-Z0-9_-]{1,80}$/.test(shop.id) ||
      !/^[a-zA-Z0-9_-]{1,80}$/.test(shop.campaignId) || !shop.title.trim() ||
      shop.title.length > 250 || !["session", "daily", "always"].includes(shop.frequency) ||
      shop.completedDays <= 0 ||
      !Number.isFinite(shop.completedDays) || !Number.isFinite(shop.openDelayMs) ||
      shop.openDelayMs < 0 || shop.openDelayMs > 60_000) {
    throw new Error(`Configuration promotionnelle invalide pour ${shop.id}.`);
  }
  if (shop.logoUrl && new URL(shop.logoUrl).protocol !== "https:") {
    throw new Error(`Le logo de ${shop.id} doit utiliser HTTPS.`);
  }
}

export function getShop(id: string): ShopConfig | undefined {
  return Object.hasOwn(shops, id) ? shops[id] : undefined;
}

export function getFrameOrigins(): string[] {
  return [...new Set(Object.values(shops).flatMap((shop) => shop.allowedOrigins))];
}
