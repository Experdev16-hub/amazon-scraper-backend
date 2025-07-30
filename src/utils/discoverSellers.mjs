import puppeteer from 'puppeteer';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { scrapeSellerDirectory } from './scrapeSellers.mjs';
import { fileURLToPath } from 'url';

puppeteerExtra.use(StealthPlugin());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SELLERS_FILE = path.resolve(__dirname, '..', 'data', 'sellerUrls.json');
const MAX_PAGES = 20;
const MAX_RETRIES = 3;
const executablePath =
  process.env.CHROME_PATH 
  || '/usr/bin/chromium-browser'; // Dockerfile sets CHROME_PATH


export async function getBrowser() {
  return puppeteer.launch({
    executablePath,
    headless: true, // default in recent versions
    args: (process.env.PUPPETEER_ARGS || '')
      .split(' ')
      .filter(Boolean)
  });
}

const clearSellerFile = () => {
  fs.writeFileSync(SELLERS_FILE, '');
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

  const browser = await getBrowser();

  const page = await browser.newPage();
  console.log('Opening browser and navigating to Amazon...'); 
  await page.goto('https://www.amazon.com', { waitUntil: 'domcontentloaded' });
  console.log('opened amazon');
  console.log('Current URL:', page.url());


  
  // Search for the niche
  await page.type('input[name="field-keywords"]', niche);
  console.log('typed keyword for search')

 await Promise.all([
  page.waitForNavigation({
    waitUntil: 'domcontentloaded', // or 'networkidle0'
    timeout: 600000, // 600 seconds
  }),

   page.waitForSelector('input[type="submit"]', { visible: true }),
   console.log('submit selector found'),

   page.click('input[type="submit"]'),
    console.log('submit clicked')
  ]);

  
  let currentPage = 1;
  let nextPageExists = true;

  while (nextPageExists && currentPage <= maxPages) {
    console.log(`🔎 Scraping page ${currentPage}...`);
    await page.waitForSelector('a.a-link-normal');

    const products = await page.$$eval('a.a-link-normal', links => {
      return links
        .filter(link => link.href.includes('/dp/'))
        .map(link => {
          const href = link.href;
          const idMatch = href.match(/\/dp\/([A-Z0-9]+)/);
          const id = idMatch ? idMatch[1] : null;
          return {
            link: href.split('?')[0],
            name: link.textContent.trim().replace(/\s+/g, ' ').substring(0, 100),
            id,
          };
        })
        .filter(product => product.id);
    });

    let newCount = 0;
    for (const product of products) {
      if (!seenIds.has(product.id)) {
        seenIds.add(product.id);
        saveSeller({
          id: product.id,
          name: product.name,
          link: product.link,
      })
    }

    console.log(`✅ Found ${newCount} new unique products on page ${currentPage}`);

    if (currentPage >= maxPages) {
      console.log(`🛑 Reached max page limit: ${maxPages}`);
      break;
    }

    const nextButton = await page.$('a.s-pagination-next');
    if (nextButton) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }),
        nextButton.click(),
      ]);
      await sleep(2000);
      currentPage++;
    } else {
      console.log('📦 No more pages to scrape.');
      break;
    }
  }

  await browser.close();
  console.log('✅ Finished scraping.');
}

  await browser.close();
  await scrapeSellerDirectory(res);

  if (res) {
    res.json({ message: '✅ Seller scraping complete.' });
  }
}