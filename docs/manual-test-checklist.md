# GBP Auditor Manual Test Checklist

This document outlines the manual test procedures for the GBP Auditor Chrome Extension and backend API.

## Backend Tests

### Unit & Integration Tests
- [ ] Run unit tests
  ```bash
  cd backend
  npm test
  ```
  - **Expected:** All unit tests pass (14/14)
  - **Validates:** Analyze logic, PDF generation, scoring, gap detection

---

## Backend Live Tests

### Test 1: Competitor Scrape Endpoint
- [ ] Start backend locally
  ```bash
  node src/index.js
  ```
  - **Expected:** Server listens on port 3000

- [ ] Call competitor scrape endpoint
  ```bash
  curl -X POST http://localhost:3000/scrape/competitors \
    -H "Content-Type: application/json" \
    -d '{"category":"Roofing contractor","lat":29.7604,"lng":-95.3698}'
  ```
  - **Expected:** Returns JSON with `competitors` array
  - **Validates:**
    - Array contains 1–5 competitor objects
    - Each competitor has `name` (string) and `rating` (number)
    - Response time < 5 seconds

### Test 2: Keyword Suggestion Endpoint
- [ ] Call keyword suggestion endpoint
  ```bash
  curl -X POST http://localhost:3000/suggest-keywords \
    -H "Content-Type: application/json" \
    -d '{"businessName":"Houston Roofing Pro","category":"Roofing contractor","location":"Houston, TX"}'
  ```
  - **Expected:** Returns JSON with `keywords` array
  - **Validates:**
    - Array contains 8–10 keyword strings
    - Each keyword contains "Houston" or location-relevant terms
    - Keywords are unique and not duplicated

### Test 3: Full Analyze Endpoint
- [ ] Call analyze endpoint with fixture
  ```bash
  curl -X POST http://localhost:3000/analyze \
    -H "Content-Type: application/json" \
    -d @backend/tests/fixtures/analyzePayload.json
  ```
  - **Expected:** Returns JSON audit result with structure:
    ```json
    {
      "scores": { "overall": number, "profile": number, "engagement": number, ... },
      "issues": [ { severity: "error"|"warning", message: string }, ... ],
      "gaps": [ { name: string, ... }, ... ],
      "tasks": {
        "week1": [ { title: string, ... }, ... ],
        "week2": [ ... ],
        "week3": [ ... ],
        "week4": [ ... ]
      },
      "keywordSummary": { "matched": number, "unmatched": number }
    }
    ```
  - **Validates:**
    - Scores are numeric and between 0–100
    - Issues array populated with relevant audit findings
    - Gaps include competitor names from payload
    - Four weeks of actionable tasks returned
    - Keyword summary reflects keyword matching

### Test 4: PDF Generation Endpoint
- [ ] Prepare files for PDF generation
  ```bash
  # These files should already exist in backend/tests/fixtures/
  cat backend/tests/fixtures/auditResult.json
  cat backend/tests/fixtures/clientProfile.json
  cat backend/tests/fixtures/competitors.json
  ```

- [ ] Call PDF endpoint
  ```bash
  curl -X POST http://localhost:3000/pdf \
    -H "Content-Type: application/json" \
    -d '{
      "auditResult": <paste auditResult.json content>,
      "clientProfile": <paste clientProfile.json content>,
      "competitors": <paste competitors.json content>,
      "baseline": null
    }' \
    -o test-report.pdf
  ```
  - **Expected:** `test-report.pdf` file created (~1–2 MB)
  - **Validates:**
    - PDF file is valid and can be opened
    - File size is reasonable (no empty or corrupt PDF)

- [ ] Verify PDF content
  - **Open:** `test-report.pdf` in Adobe Reader, Preview, or browser
  - **Expected:** All 6 pages present
    - Page 1: Title page with client name, report date, overall score
    - Page 2: Scorecard with metric cards (profile, engagement, visibility, etc.)
    - Page 3: Issues list (errors & warnings)
    - Page 4: Gaps (missing attributes vs. competitors)
    - Page 5: 4-Week Action Plan (week 1–4 tasks)
    - Page 6: Appendix (competitor list, keyword summary)
  - **Validates:**
    - All pages render correctly
    - Client name "Houston Roofing Pro" appears on first page
    - Task descriptions reference competitor names (e.g., "Acme Roofing")
    - No missing fonts or rendering errors

---

## Extension Tests

### Test 5: Extension Happy Path (Full Flow)
1. **Load Extension**
   - [ ] In Chrome, open `chrome://extensions/`
   - [ ] Enable "Developer mode" (top right)
   - [ ] Click "Load unpacked"
   - [ ] Select `gbp-auditor/extension/` folder
   - [ ] Expected: GBP Auditor extension appears in extension list with icon

2. **Navigate to Google Maps Business Listing**
   - [ ] Go to https://www.google.com/maps
   - [ ] Search for "Houston Roofing Pro" (or any real business)
   - [ ] Click on business listing to open detailed view
   - [ ] Expected: Currently viewing a specific business card/details page

3. **Step 1: Business Information**
   - [ ] Click GBP Auditor extension icon in Chrome toolbar
   - [ ] Popup opens to Step 1
   - [ ] **Verify populated fields:**
     - [ ] Business name is populated (extracted from Maps page)
     - [ ] Category shows "Roofing contractor" or relevant category
     - [ ] Rating appears (e.g., 4.2 stars)
     - [ ] Review count visible (e.g., "18 reviews")
   - [ ] Click "Next" button
   - [ ] Expected: Proceeds to Step 2 without errors

4. **Step 2: Competitor Analysis**
   - [ ] Step 2 displays "Competitor Analysis" title
   - [ ] **Verify competitors loaded:**
     - [ ] List shows 1–5 competitors
     - [ ] Each competitor has name, rating, and review count
     - [ ] Competitors appear to be in same category
   - [ ] Click "Next" button
   - [ ] Expected: Proceeds to Step 3 without errors

5. **Step 3: Keyword Strategy**
   - [ ] Step 3 displays keyword chips
   - [ ] **Verify initial keywords:**
     - [ ] 8–10 keyword chips displayed (e.g., "roofing company Houston")
     - [ ] Each chip is clickable and has an X to remove
     - [ ] Keywords are relevant to business and location
   - [ ] **Add manual keyword:**
     - [ ] Click "Add Keyword" input field
     - [ ] Type a custom keyword (e.g., "emergency roof repair")
     - [ ] Press Enter or click Add button
     - [ ] Expected: New chip appears in the list
   - [ ] Click "Next" button
   - [ ] Expected: Proceeds to Step 4 without errors

6. **Step 4: Audit Summary & Report Generation**
   - [ ] Step 4 displays summary counts:
     - [ ] Business name matches Step 1 entry
     - [ ] Competitor count matches Step 2 selection
     - [ ] Keyword count includes manually added keywords
   - [ ] **Generate PDF Report:**
     - [ ] Click "Generate PDF Report" button
     - [ ] Status message appears (e.g., "Fetching audit...")
     - [ ] Status cycles through: "Analyzing...", "Generating PDF...", "Ready to download"
     - [ ] Wait for "Download PDF Report" button to appear (timeout: 30 seconds)
   - [ ] Click "Download PDF Report" button
   - [ ] Expected: PDF file downloads to default Downloads folder

7. **Verify Downloaded PDF**
   - [ ] Open downloaded PDF in PDF viewer
   - [ ] **Verify content:**
     - [ ] All 6 pages present
     - [ ] Client name "Houston Roofing Pro" (or searched business) on cover page
     - [ ] Report date shown
     - [ ] Scorecard metrics visible (overall, profile, engagement, etc.)
     - [ ] Competitor names appear in gaps section
     - [ ] 4-week action plan populated with tasks
   - [ ] **Verify formatting:**
     - [ ] No rendering errors or missing fonts
     - [ ] Colors consistent across pages
     - [ ] Charts/icons load correctly

---

### Test 6: Error Handling
- [ ] **Wrong Page Test:**
  - [ ] Navigate to https://www.google.com (Google homepage, NOT Maps)
  - [ ] Click GBP Auditor extension icon
  - [ ] Expected: Step 1 shows error message
    ```
    "Make sure you are on a Google Maps business listing page."
    ```
  - [ ] Error displays prominently in red/warning color

---

### Test 7: Baseline Comparison
- [ ] **Generate First Report:**
  - [ ] Run full extension flow (Steps 1–4) on a business
  - [ ] Generate and download PDF report
  - [ ] Save as `report-v1.pdf` for reference

- [ ] **Generate Second Report (Same Business):**
  - [ ] Close and reopen extension popup
  - [ ] Run flow again on same business
  - [ ] Generate and download PDF report
  - [ ] Save as `report-v2.pdf`

- [ ] **Verify Delta Indicators:**
  - [ ] Open `report-v2.pdf`
  - [ ] On Scorecard page (Page 2), look for delta indicators
  - [ ] **Expected changes (if scores changed):**
    - [ ] Arrows or indicators showing ↑ (improved) or ↓ (declined) from baseline
    - [ ] Color coding: Green for improvement, red for decline
  - [ ] **If no changes:**
    - [ ] Baseline comparison displays neutral indicator (–)

---

## Post-Test Sign-Off

- [ ] All backend tests pass (14/14)
- [ ] All backend live tests succeed
- [ ] PDF generation produces valid, complete 6-page report
- [ ] Extension loads and populates data correctly
- [ ] Full 4-step flow completes without errors
- [ ] PDF download works and file is valid
- [ ] Error handling works as expected
- [ ] Baseline comparison functions correctly

**Test Date:** _______________

**Tester Name:** _______________

**Notes / Issues Found:**
```
(Document any failures or unexpected behaviors here)
```

---

## Cleanup

After testing:
- [ ] Close backend server (`Ctrl+C` in terminal)
- [ ] Remove test PDF files
- [ ] Unload extension from `chrome://extensions/` if desired
