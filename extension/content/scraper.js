// Google Maps DOM selectors — verified mid-2026. Update if Maps changes its layout.
const SEL = {
  name: 'h1.DUwDvf',
  category: 'button.DkEaL',
  rating: '.F7nice span[aria-hidden="true"]',
  address: 'button[data-item-id="address"] .Io6YTe',
  website: 'a[data-item-id="authority"]',
  phone: '[data-item-id^="phone:tel:"] .Io6YTe',
  hours: '.t39EBf',
  reviews: '.jftiEf .jJc9Ad',
  ownerResponse: '.CDe7pd',
  posts: '.hqbdD',
};

// Try multiple selectors in order, return first match
function queryFirst(...selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function extractLatLng() {
  const match = window.location.href.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (!match) return { lat: null, lng: null };
  return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
}

function extractReviewCount() {
  // Try aria-label first: "1,234 reviews" or "1,234 Rezensionen" etc.
  const byAria = document.querySelector('button[aria-label*="review"], [aria-label*="reviews"], button[aria-label*="Review"]');
  if (byAria) {
    const m = byAria.getAttribute('aria-label').match(/[\d,]+/);
    if (m) return parseInt(m[0].replace(/,/g, ''));
  }
  // Fallback: button near rating with jsaction
  const byAction = document.querySelector('button[jsaction*="pane.rating"]');
  if (byAction) return parseInt(byAction.textContent.replace(/[^\d]/g, '')) || 0;
  // Fallback: span containing review count text near rating
  const spans = document.querySelectorAll('.F7nice span, .HHrUdb');
  for (const s of spans) {
    const n = parseInt(s.textContent.replace(/[^\d]/g, ''));
    if (n > 0) return n;
  }
  return 0;
}

function extractPhotoCount() {
  // Look for elements whose aria-label matches "N photos of …" or "See N photos"
  // Exclude thumbnail buttons like "Photo 1 of N" (where the number comes after "Photo ")
  const all = document.querySelectorAll('[aria-label]');
  for (const el of all) {
    const label = el.getAttribute('aria-label') || '';
    // Must have a number followed by "photo" — excludes "Photo 1 of N" patterns
    if (/^\d[\d,]*\s+photo/i.test(label) || /see\s+\d[\d,]*\s+photo/i.test(label)) {
      const m = label.match(/[\d,]+/);
      if (m) return parseInt(m[0].replace(/,/g, ''));
    }
  }
  return 0;
}

function extractDescription() {
  // The "From the business" description lives in the About section.
  // Exclude review snippets by checking parent context.
  const candidates = document.querySelectorAll('.PYvSYb, .MyEned, .iP2t7d');
  for (const el of candidates) {
    // Skip if this element is inside a review container
    if (el.closest('.jftiEf, .MyEned[class*="review"], [data-review-id]')) continue;
    const text = el.textContent?.trim();
    if (text && text.length > 10) return text;
  }
  // Fallback: look for "From the business" section header then grab sibling text
  const headers = document.querySelectorAll('h2, h3, .iL3Qke');
  for (const h of headers) {
    if (/from the business|about|description/i.test(h.textContent)) {
      const sibling = h.nextElementSibling;
      if (sibling) return sibling.textContent?.trim() || null;
    }
  }
  return null;
}

function extractReviewStats() {
  const reviewEls = document.querySelectorAll(SEL.reviews);
  const responseEls = document.querySelectorAll(SEL.ownerResponse);
  const total = reviewEls.length;
  const responded = responseEls.length;
  const responseRate = total > 0 ? Math.round((responded / total) * 100) / 100 : null;

  let recentCount = 0;
  reviewEls.forEach(el => {
    const dateText = el.querySelector('.rsqaWe')?.textContent || '';
    // Google shows relative dates ("3 days ago", "2 weeks ago") — count anything recent-looking
    if (/day|week|hour/i.test(dateText)) recentCount++;
  });

  return { responseRate, recentReviews30d: recentCount };
}

function scrapeProfile() {
  const name = document.querySelector(SEL.name)?.textContent?.trim() || null;
  const category = document.querySelector(SEL.category)?.textContent?.trim() || null;
  const address = document.querySelector(SEL.address)?.textContent?.trim() || null;
  const website = document.querySelector(SEL.website)?.href || null;
  const phone = document.querySelector(SEL.phone)?.textContent?.trim() || null;
  const rating = parseFloat(document.querySelector(SEL.rating)?.textContent) || null;
  const hoursSet = !!document.querySelector(SEL.hours);
  const postsLast30d = document.querySelectorAll(SEL.posts).length;

  const reviewCount = extractReviewCount();
  const photoCount = extractPhotoCount();
  const description = extractDescription();

  const { lat, lng } = extractLatLng();
  const { responseRate, recentReviews30d } = extractReviewStats();

  return {
    name,
    category,
    address,
    phone,
    website,
    rating,
    reviewCount,
    photoCount,
    hoursSet,
    description,
    location: { lat, lng },
    baselineKey: `${name}|${address}`,
    responseRate,
    recentReviews30d,
    postsLast30d,
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'getProfile') {
    try {
      const data = scrapeProfile();
      if (!data.name) {
        sendResponse({ success: false, error: 'Could not find business name. Make sure you are on a Google Maps business listing page.' });
      } else {
        sendResponse({ success: true, data });
      }
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
    return true; // keep channel open for async
  }
});
