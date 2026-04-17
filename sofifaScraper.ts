import { chromium } from "playwright";

export type PlayerCard = {
  name: string;
  overall: number | null;
  potential: number | null;
  playerUrl: string | null;
};

function toNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function cleanText(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.replace(/\s+/g, " ").trim();
  return v.length ? v : null;
}

export async function searchPlayers(playerName: string): Promise<PlayerCard[]> {
  const browser = await chromium.launch({
    headless: false,
  });

  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    viewport: { width: 1600, height: 900 },
    locale: "pt-BR",
  });

  try {
    await page.goto("https://sofifa.com/players?offset=0", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForTimeout(3000);

    const searchInput = page
      .locator('input[placeholder*="Procurar jogador"], input[placeholder*="Search player"]')
      .first();

    await searchInput.waitFor({ timeout: 15000 });
    await searchInput.fill(playerName);
    await page.keyboard.press("Enter");

    await page.waitForTimeout(5000);

    const links = page.locator('a[href*="/player/"]');
    const linkCount = await links.count();

    const results: PlayerCard[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < linkCount; i++) {
      const link = links.nth(i);

      const name = cleanText(await link.textContent());
      const href = await link.getAttribute("href");

      if (!name || !href) continue;
      if (seen.has(href)) continue;

      const row = link.locator("xpath=ancestor::tr[1]");
      const rowCount = await row.count();

      if (rowCount === 0) continue;

      const cols = row.locator("td");
      const colCount = await cols.count();

      if (colCount < 5) continue;

      const overallText = await cols.nth(3).textContent();
      const potentialText = await cols.nth(4).textContent();

      results.push({
        name,
        overall: toNumber(overallText),
        potential: toNumber(potentialText),
        playerUrl: `https://sofifa.com${href}`,
      });

      seen.add(href);
    }

    return results;
  } finally {
    await browser.close();
  }
}

searchPlayers("Mbappe")
  .then((players) => {
    console.log(JSON.stringify(players, null, 2));
  })
  .catch((err) => {
    console.error("Erro no scraper:", err);
  });