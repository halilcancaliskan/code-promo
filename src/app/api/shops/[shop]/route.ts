import { getShop } from "@/lib/shops";

export async function GET(request: Request, context: { params: Promise<{ shop: string }> }) {
  const { shop: id } = await context.params;
  const shop = getShop(id);
  // Browsers omit Origin for same-origin GET requests.
  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  if (!shop || !shop.allowedOrigins.includes(origin)) {
    return Response.json({ error: "Boutique inconnue ou origine non autorisée." }, { status: 403 });
  }
  return Response.json({
    id: shop.id, campaignId: shop.campaignId, title: shop.title,
    openDelayMs: shop.openDelayMs, frequency: shop.frequency, completedDays: shop.completedDays,
  }, {
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Vary": "Origin",
      "Cache-Control": "no-store",
    },
  });
}
