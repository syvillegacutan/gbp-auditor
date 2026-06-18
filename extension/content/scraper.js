// Google Maps DOM selectors — verified mid-2026. Update if Maps changes its layout.
const SEL = {
  name: 'h1.DUwDvf',
  category: 'button.DkEaL',
  rating: '.F7nice span[aria-hidden="true"]',
  reviewCount: 'button[jsaction*="pane.rating"]',
  address: 'button[data-item-id="address"] .Io6YTe',
  website: 'a[data-item-id="authority"]',
  phone: '[data-item-id^="phone:tel:"] .Io6YTe',
  hours: '.t39EBf',
  description: '.PYvSYb',
  photoCountBtn: '[aria-label*="photo"]',
  reviews: '.jftiEf .jJc9Ad',
  ownerResponse: '.CDe7pd',
  posts: '.hqbdD',
};

function extractLatLng() {
  const match = window.location.href.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (!match) return { lat: null, lng: null };
  return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
}

function extractReviewStats() {
  const reviewEls = document.querySelectorAll(SEL.reviews);
  const responseEls = document.querySelectorAll(SEL.ownerResponse);
  const total = reviewEls.length;
  const responded = responseEls.length;
  const responseRate = total > 0 ? Math.round((responded / total) * 100) / 100 : null;

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
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
  const description = document.querySelector(SEL.description)?.textContent?.trim() || null;
  const postsLast30d = document.querySelectorAll(SEL.posts).length;

  const reviewCountText = document.querySelector(SEL.reviewCount)?.textContent || '';
  const reviewCount = parseInt(reviewCountText.replace(/[^\d]/g, '')) || 0;

  const photoText = document.querySelector(SEL.photoCountBtn)?.getAttribute('aria-label') || '';
  const photoMatch = photoText.match(/(\d[\d,]*)/);
  const photoCount = photoMatch ? parseInt(photoMatch[1].replace(/,/g, '')) : 0;

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
