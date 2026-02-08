const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Cache to store results and reduce scraping
const searchCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Scrape DrugEye website for drug information
 */
async function scrapeDrugEye(searchTerm) {
  let browser = null;

  try {
    console.log(`[DrugEye] Searching for: ${searchTerm}`);

    // Check cache first
    const cacheKey = searchTerm.toLowerCase().trim();
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[DrugEye] Cache hit for: ${searchTerm}`);
      return cached.data;
    }

    // Array to store captured API responses
    const apiResponses = [];

    // Launch Puppeteer with optimized settings
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
        '--ignore-certificate-errors',
        '--ignore-ssl-errors',
        '--ignore-certificate-errors-spki-list'
      ]
    });

    const page = await browser.newPage();

    // Ignore certificate errors
    await page.setBypassCSP(true);

    // Intercept network requests to capture API responses
    await page.on('response', async (response) => {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';

      // Capture JSON responses and HTML responses that might contain drug data
      if (contentType.includes('json') || contentType.includes('html')) {
        try {
          const responseData = await response.text();
          if (responseData && responseData.length > 0 && responseData.length < 50000) {
            // Only capture responses that look like they might contain drug data
            if (responseData.toLowerCase().includes('tablet') ||
              responseData.toLowerCase().includes('capsule') ||
              responseData.toLowerCase().includes('mg') ||
              responseData.toLowerCase().includes('price') ||
              responseData.toLowerCase().includes('drug') ||
              responseData.toLowerCase().includes('panadol') ||
              responseData.toLowerCase().includes('paracetamol')) {
              apiResponses.push({
                url: url,
                contentType: contentType,
                data: responseData
              });
              console.log(`[DrugEye] Captured response from: ${url.substring(0, 80)}...`);
            }
          }
        } catch (e) {
          // Ignore errors reading response
        }
      }
    });

    // Set user agent to appear as a normal browser
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Navigate to the DrugEye website with search parameter
    const baseUrl = 'https://drugeye.pharorg.com/drugeyeapp/android-search/drugeye-android-live-go.aspx';
    const url = `${baseUrl}?search=${encodeURIComponent(searchTerm)}`;
    console.log(`[DrugEye] Navigating to: ${url}`);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for JavaScript to execute and any AJAX requests to complete
    await page.waitForTimeout(8000);

    // Try to interact with search form if no results loaded
    const hasResults = await page.evaluate(() => {
      // Check if page has drug-related content
      const bodyText = document.body.textContent || '';
      return bodyText.toLowerCase().includes('tablet') ||
        bodyText.toLowerCase().includes('capsule') ||
        bodyText.toLowerCase().includes('mg') ||
        bodyText.toLowerCase().includes('price');
    });

    if (!hasResults) {
      console.log(`[DrugEye] No results found via URL, trying form interaction`);
      try {
        // Use page.evaluate to safely interact with the form
        await page.evaluate((term) => {
          // Find all text inputs
          const inputs = document.querySelectorAll('input[type="text"], input:not([type])');
          for (const input of inputs) {
            // Check if input is visible and likely a search field
            const style = window.getComputedStyle(input);
            if (style.display !== 'none' && style.visibility !== 'hidden') {
              input.value = term;
              // Trigger input and change events
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));

              // Try to find and click submit button
              const form = input.closest('form');
              if (form) {
                const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
                if (submitBtn) {
                  submitBtn.click();
                } else {
                  form.dispatchEvent(new Event('submit', { bubbles: true }));
                }
              }
              break;
            }
          }
        }, searchTerm);

        // Wait for results after form submission
        await page.waitForTimeout(8000);
      } catch (formError) {
        console.log(`[DrugEye] Form interaction error: ${formError.message}`);
      }
    }

    // Process captured API responses first
    let drugs = [];
    for (const response of apiResponses) {
      if (response.contentType.includes('json')) {
        try {
          const jsonData = JSON.parse(response.data);
          // Handle different JSON response formats
          if (Array.isArray(jsonData)) {
            drugs = jsonData.map(item => ({
              trade_name: item.name || item.trade_name || item.drugName || 'Unknown',
              active_ingredient: item.active_ingredient || item.ingredient || 'N/A',
              price: item.price || 'N/A',
              company: item.company || item.manufacturer || 'N/A',
              form: item.form || item.dosage_form || 'N/A',
              raw_text: JSON.stringify(item).substring(0, 200)
            }));
          } else if (jsonData.data && Array.isArray(jsonData.data)) {
            drugs = jsonData.data.map(item => ({
              trade_name: item.name || item.trade_name || item.drugName || 'Unknown',
              active_ingredient: item.active_ingredient || item.ingredient || 'N/A',
              price: item.price || 'N/A',
              company: item.company || item.manufacturer || 'N/A',
              form: item.form || item.dosage_form || 'N/A',
              raw_text: JSON.stringify(item).substring(0, 200)
            }));
          }
        } catch (e) {
          console.log(`[DrugEye] Failed to parse JSON response`);
        }
      }
    }

    // If no drugs from API responses, parse the page HTML
    if (drugs.length === 0) {
      drugs = await page.evaluate(() => {
        const results = [];

        // Helper function to check if text looks like drug information (more strict)
        function isDrugRelated(text) {
          // Exclude JavaScript code
          if (text.includes('function(') || text.includes('$(') || text.includes('click(') ||
            text.includes('.css(') || text.includes('.hide(') || text.includes('console.')) {
            return false;
          }

          // Must have at least one specific drug indicator
          const hasPrice = /(\d+\.?\d*)\s*(EGP|LE|ج\.م|جنيه)/i.test(text);
          const hasDosage = /\d+\s*mg|\d+\s*ml|\d+\s*%/i.test(text);
          const hasForm = /tablet|capsule|syrup|injection|cream|أقراص|كبسولة|شراب|حقنة|كريم/i.test(text);

          return hasPrice || hasDosage || hasForm;
        }

        // Helper to extract trade name from text
        function extractTradeName(text) {
          // Look for patterns like "Panadol 500mg", "Brufen Tablets", etc.
          const patterns = [
            /^([A-Z][a-zA-Z\s]{2,30})\s+(mg|tablet|capsule|syrup)/i,
            /^([A-Z][a-zA-Z\s]{2,30})\s+\d+/,
            /^([أ-ي\s]{2,30})\s+(أقراص|كبسولة|شراب)/
          ];

          for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
              return match[1].trim();
            }
          }

          // If no pattern matches, return first meaningful words
          const words = text.split(/\s+/).filter(w => w.length > 2);
          if (words.length > 0) {
            return words.slice(0, 3).join(' ');
          }

          return 'Unknown Drug';
        }

        // Try to find structured data in tables (excluding header rows)
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
          const rows = Array.from(table.querySelectorAll('tr')).slice(1); // Skip header
          rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
              const text = row.textContent || '';
              const trimmed = text.trim();

              // More strict filtering
              if (trimmed.length > 20 && trimmed.length < 600 && isDrugRelated(trimmed)) {
                // Try to extract structured data from cells
                const tradeName = cells[0]?.textContent?.trim() || '';
                const activeIngredient = cells[1]?.textContent?.trim() || '';
                const price = cells[2]?.textContent?.trim() || '';
                const company = cells[3]?.textContent?.trim() || '';
                const form = cells[4]?.textContent?.trim() || '';

                // Only add if we have meaningful data
                if (tradeName.length > 2) {
                  results.push({
                    trade_name: tradeName,
                    active_ingredient: activeIngredient || 'N/A',
                    price: price || 'N/A',
                    company: company || 'N/A',
                    form: form || 'N/A',
                    raw_text: trimmed.substring(0, 300)
                  });
                }
              }
            }
          });
        });

        // If no results from tables, try parsing text sections
        if (results.length === 0) {
          const bodyText = document.body.textContent || '';
          // Split by common delimiters
          const sections = bodyText.split(/\n{2,}|\t{2,}|<div|<p/);

          sections.forEach(section => {
            const trimmed = section.trim().replace(/<[^>]*>/g, ''); // Remove HTML tags

            if (trimmed.length > 40 && trimmed.length < 500 && isDrugRelated(trimmed)) {
              // Extract structured info
              const lines = trimmed.split('\n').map(l => l.trim()).filter(l => l.length > 2);

              let tradeName = 'Unknown';
              let activeIngredient = 'N/A';
              let price = 'N/A';
              let company = 'N/A';
              let form = 'N/A';

              for (const line of lines) {
                // Price detection
                const priceMatch = line.match(/(\d+\.?\d*)\s*(EGP|LE|ج\.م|جنيه)/i);
                if (priceMatch && !price.includes('EGP')) {
                  price = priceMatch[0];
                }

                // Form detection
                const formMatch = line.match(/(tablet|capsule|syrup|injection|cream|أقراص|كبسولة|شراب|حقنة|كريم)/i);
                if (formMatch && form === 'N/A') {
                  form = line.substring(0, 40);
                }

                // Company detection
                if (/company|شركة|manufacturer|produced|إنتاج/i.test(line)) {
                  company = line.replace(/company|manufacturer|produced|شركة|إنتاج|:|-|\|/gi, ' ').trim();
                }

                // Trade name - first meaningful line
                if (tradeName === 'Unknown' && line.length > 3 && line.length < 80) {
                  if (!line.includes('http') && !line.includes('$') && !line.includes('function')) {
                    tradeName = extractTradeName(line);
                  }
                }
              }

              // Only add if we found meaningful drug information
              if (isDrugRelated(trimmed) && (price !== 'N/A' || form !== 'N/A')) {
                results.push({
                  trade_name: tradeName,
                  active_ingredient: activeIngredient,
                  price: price,
                  company: company,
                  form: form,
                  raw_text: trimmed.substring(0, 300)
                });
              }
            }
          });
        }

        return results.slice(0, 10); // Limit to 10 results
      });
    }

    console.log(`[DrugEye] Found ${drugs.length} results for: ${searchTerm}`);

    // Cache the results
    searchCache.set(cacheKey, {
      data: drugs,
      timestamp: Date.now()
    });

    return drugs;

  } catch (error) {
    console.error(`[DrugEye] Scraping error:`, error.message);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * API endpoint to search for drugs
 */
app.get('/api/search', async (req, res) => {
  const { q, query, drug, name } = req.query;
  const searchTerm = q || query || drug || name;

  if (!searchTerm) {
    return res.status(400).json({
      error: 'Missing search parameter. Use ?q=drug_name or ?query=drug_name'
    });
  }

  try {
    const results = await scrapeDrugEye(searchTerm);

    // Transform results to match Supabase format
    const transformedResults = results.map(drug => ({
      Trade_name: drug.trade_name,
      Active_ingredient: drug.active_ingredient,
      Price: drug.price,
      Company: drug.company,
      Form: drug.form,
      Category: 'DrugEye Database',
      source: 'drugeye',
      raw_text: drug.raw_text
    }));

    res.json({
      success: true,
      query: searchTerm,
      count: transformedResults.length,
      data: transformedResults
    });

  } catch (error) {
    console.error('[API] Search error:', error);
    res.status(500).json({
      error: 'Failed to search DrugEye database',
      message: error.message
    });
  }
});

/**
 * Medical Knowledge API - Proxy to Python FastAPI service
 */
const MEDICAL_KNOWLEDGE_URL = process.env.MEDICAL_KNOWLEDGE_URL || 'http://localhost:8000';

app.post('/api/medical-knowledge/search', async (req, res) => {
  const { query, top_k = 3 } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter' });
  }

  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`${MEDICAL_KNOWLEDGE_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, top_k })
    });

    if (!response.ok) {
      throw new Error(`Medical Knowledge API returned ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('[Medical Knowledge] Error:', error.message);
    // Return empty results if service unavailable (graceful degradation)
    res.json({
      query,
      results: [],
      total_found: 0,
      error: 'Medical knowledge service unavailable'
    });
  }
});

app.get('/api/medical-knowledge/health', async (req, res) => {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`${MEDICAL_KNOWLEDGE_URL}/health`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.json({ status: 'unavailable', message: error.message });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'drugeye-scraper' });
});

/**
 * Clear cache endpoint
 */
app.post('/api/cache/clear', (req, res) => {
  searchCache.clear();
  res.json({ success: true, message: 'Cache cleared' });
});

// Start server
app.listen(PORT, () => {
  console.log(`[DrugEye Scraper] Server running on port ${PORT}`);
  console.log(`[DrugEye Scraper] Health check: http://localhost:${PORT}/health`);
  console.log(`[DrugEye Scraper] Search endpoint: http://localhost:${PORT}/api/search?q=panadol`);
});
