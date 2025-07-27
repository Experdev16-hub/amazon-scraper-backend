import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { executablePath } from 'puppeteer';
import { scrapeSellerDirectory } from './scrapeSellers.mjs';

puppeteer.use(StealthPlugin());

const SELLERS_FILE = path.resolve('data', 'sellerUrls.jsonl');
const MAX_PAGES = 20;
const MAX_RETRIES = 3;

const clearSellerFile = () => {
  fs.writeFileSync(SELLERS_FILE, '');
};

const loadExistingSellers = () => {
  if (!fs.existsSync(SELLERS_FILE)) return new Set();
  const lines = fs.readFileSync(SELLERS_FILE, 'utf-8').trim().split('\n');
  return new Set(lines.map(line => JSON.parse(line).sellerId));
};

const saveSeller = (seller) => {
  fs.appendFileSync(SELLERS_FILE, JSON.stringify(seller) + '\n');
};

const retry = async (fn, retries = MAX_RETRIES) => {
  while (retries > 0) {
    try {
      return await fn();
    } catch (err) {
      retries--;
      if (retries === 0) throw err;
    }
  }
};

export async function discoverSellers(niche, res = null) {
  clearSellerFile();

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: executablePath(),
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('https://www.amazon.com', { waitUntil: 'domcontentloaded' });

  // Accept cookies if shown
  try {
    await page.click('#sp-cc-accept', { timeout: 3000 });
  } catch {}

  // Search for the niche
  await page.type('input[name="field-keywords"]', niche);
  await Promise.all([
    page.keyboard.press('Enter'),
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
  ]);

  const seenSellerIds = new Set();

  for (let pageNum = 0; pageNum < MAX_PAGES; pageNum++) {
    console.log(`🔍 Scraping niche "${niche}", page ${pageNum + 1}`);

    const productLinks = await page.$$eval('a.a-link-normal.s-no-outline', links =>
      links.map(link => link.href).filter(href => href.includes('/dp/'))
    );

    if (productLinks.length === 0 && pageNum === 0 && res) {
      res.json({ message: '❌ No products found for this niche.' });
      await browser.close();
      return;
    }

    for (const link of productLinks) {
      try {
        await retry(() => page.goto(link, { waitUntil: 'domcontentloaded' }));

        const sellerSection = await page.$x("//*[contains(text(), 'Sold by')]/following-sibling::span[1]//a");
        if (sellerSection.length > 0) {
          const profileUrl = await page.evaluate(el => el.href, sellerSection[0]);
          const sellerName = await page.evaluate(el => el.textContent.trim(), sellerSection[0]);
          const match = profileUrl.match(/seller=([A-Z0-9]+)/);
          const sellerId = match ? match[1] : null;

          if (sellerId && !seenSellerIds.has(sellerId)) {
            seenSellerIds.add(sellerId);
            saveSeller({ sellerId, sellerName, profileUrl });
            console.log(`✅ Found seller: ${sellerName} (${sellerId})`);
          } else {
            console.log(`⚠️ Seller already seen or ID not found`);
          }
        } else {
          console.log('❌ No seller found on product');
        }

        await page.goBack({ waitUntil: 'domcontentloaded' });
      } catch (err) {
        console.log(`❌ Error with product ${link}: ${err.message}`);
      }
    }

    const nextButton = await page.$('a.s-pagination-next');
    if (!nextButton) break;
    await Promise.all([
      nextButton.click(),
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    ]);
  }

  await browser.close();
  await scrapeSellerDirectory(res);

  if (res) {
    res.json({ message: '✅ Seller scraping complete.' });
  }
}
