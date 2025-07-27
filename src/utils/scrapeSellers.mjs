import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { executablePath } from 'puppeteer';

puppeteer.use(StealthPlugin());

const SELLERS_FILE = path.resolve('data', 'sellerUrls.jsonl');
const DETAILS_FILE = path.resolve('data', 'sellerDetails.jsonl');
const MAX_RETRIES = 3;

export async function scrapeSellerDirectory() {
  if (!fs.existsSync(SELLERS_FILE)) {
    console.log('❌ No seller URLs found to scrape.');
    return;
  }

  // Clear previous seller details
  fs.writeFileSync(DETAILS_FILE, '');

  const lines = fs.readFileSync(SELLERS_FILE, 'utf-8').trim().split('\n');
  const sellers = lines.map(line => JSON.parse(line));

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: executablePath(),
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();

  for (const { sellerId, sellerName, profileUrl } of sellers) {
    let retries = 0;
    let success = false;

    while (retries < MAX_RETRIES && !success) {
      try {
        await page.goto(profileUrl, { waitUntil: 'domcontentloaded' });

        // Check if profile exists
        const notFound = await page.$x("//*[contains(text(), 'Sorry') or contains(text(), 'not available') or contains(text(), 'unavailable')]");
        if (notFound.length > 0) {
          console.log(`❌ Profile not available for ${sellerName}`);
          break;
        }

        const sellerData = await page.evaluate(() => {
          const getText = (sel) => document.querySelector(sel)?.innerText || '';
          const getAttr = (sel, attr) => document.querySelector(sel)?.getAttribute(attr) || '';

          return {
            businessName: getText('#sellerName'),
            rating: getText('.feedback-detail-star-rating span'),
            totalRatings: getText('.feedback-detail-total-feedback span'),
            address: getText('#seller-info-storefront-address'),
            logo: getAttr('.seller-logo img', 'src'),
            about: getText('#seller-info-storefront-description')
          };
        });

        fs.appendFileSync(DETAILS_FILE, JSON.stringify({ sellerId, sellerName, profileUrl, ...sellerData }) + '\n');
        console.log(`✅ Scraped details for ${sellerName}`);
        success = true;
      } catch (err) {
        console.log(`🔁 Retry ${retries + 1} for ${sellerName} due to error: ${err.message}`);
        retries++;
        await new Promise(res => setTimeout(res, 2000));
      }
    }

    if (!success) {
      console.log(`❌ Failed to scrape seller: ${sellerName} after ${MAX_RETRIES} retries`);
    }
  }

  await browser.close();
  console.log('✅ Scraping completed and data written to sellerDetails.jsonl');
}
