import GameShell from "@/components/game-shell";
import { getShop } from "@/lib/shops";

export const dynamic = "force-dynamic";

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const shop = typeof params.shop === "string" ? getShop(params.shop) : undefined;
  const origin = params.parent;
  const channel = params.channel;
  if (!shop || typeof origin !== "string" || !shop.allowedOrigins.includes(origin) ||
      typeof channel !== "string" || !/^[a-f0-9]{32}$/.test(channel)) {
    return <main className="frame-error"><h1>Intégration non autorisée</h1><p>Vérifiez la boutique et son origine dans la configuration.</p></main>;
  }
  return <GameShell shop={shop} parentOrigin={origin} channel={channel} />;
}
