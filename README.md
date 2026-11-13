# Unified App Store Review Analytics Dashboard

A modern, responsive web application that collects, aggregates, and visualizes app ratings and user reviews from both the **Apple App Store** and the **Google Play Store** in one unified analytics dashboard.

The application features live store data collection (no hardcoded fake data or mock responses in production), side-by-side platform comparisons, recent customer reviews with multi-dimensional filtering, and preset switching starting with **boAt Hearables** as the default reference.

---

## Features

- **Live Multi-Store Retrieval:**
  - **Google Play Store:** Connects directly via `google-play-scraper` to pull official app title, developer, app icon, overall rating score, total ratings count, written reviews count, and the 30 newest customer reviews.
  - **Apple App Store:** Queries the public Apple iTunes Lookup API for official track metadata, overall user rating score, and rating count, and parses the Apple Customer Reviews RSS feed for the 30 newest written reviews.
- **Unified Analytics & Rating Comparison:**
  - Standardized 0.0 to 5.0 rating scale comparison using Recharts.
  - Rating difference calculation (e.g. `+0.09` indicating which store is rated higher).
  - Volume ratio comparison (e.g. Google Play ratings volume vs Apple App Store volume).
  - Measurement integrity: Explicit distinction between the official storewide ratings and the localized 30-review recent sample.
- **Recent Reviews Explorer:**
  - Aggregates and displays the 30 newest reviews per platform (ordered newest to oldest).
  - Filter tabs: **All Stores**, **Google Play Store**, **Apple App Store**.
  - Star rating filtering (1 to 5 stars or all).
  - Free-text search across review content, titles, and author names.
  - Sorting by newest, oldest, highest rating, or lowest rating.
  - Date range filters (All, Last 7 Days, Last 30 Days, Last 90 Days).
  - Individual review cards showing platform badge, visual star rating, review title (Apple), review text, author name, timestamp, app version, and review identifier.
  - Pagination / "Load More" controls.
- **Search & App Selection Interface:**
  - Modal search supporting Google Play, Apple App Store, or both simultaneously.
  - Country/storefront selector (India `in`, United States `us`, United Kingdom `gb`, Canada `ca`, Germany `de`, etc.).
  - Search results display app icons, developer names, ratings, and platform tags.
  - Manual ID / URL input supporting direct package IDs (`com.boAt.hearables`), Apple track IDs (`1592550875`), or store URLs.
  - 1-click Preset Selector for instant switching between popular cross-platform applications (**boAt Hearables [Default]**, Spotify, WhatsApp, Duolingo, Netflix).
- **Resilient & Independent Error Handling:**
  - Platform isolation: If one store encounters network throttling or an invalid identifier, that specific card highlights the error while the other store displays its full analytics normally.
  - Clear "Unavailable" tags for missing fields (such as written reviews count which Apple lookup does not expose).
- **Modern SaaS UI:**
  - Built with Tailwind CSS, Lucide icons, and Recharts.
  - Toast notifications for real-time status updates and data refresh operations.
  - Skeleton loading states.

---

## Technology Stack

- **Frontend:**
  - React 18 with TypeScript
  - Vite 6
  - Tailwind CSS 3
  - Recharts (Rating bar charts & distribution charts)
  - Lucide React (Accessible iconography)
- **Backend:**
  - Python 3.10+ (Tested on Python 3.13)
  - FastAPI
  - Uvicorn (ASGI web server)
  - `google-play-scraper` (Google Play store metadata and reviews retrieval)
  - `requests` (Apple iTunes lookup and RSS JSON endpoints)
  - `pydantic` (Data schemas and input validation)
  - `pytest` & `httpx` (Automated backend testing suite)

---

## Project Structure

```
sentiment_analyser/
├── backend/
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py              # REST API endpoints (/api/health, /api/apps/...)
│   ├── services/
│   │   ├── __init__.py
│   │   ├── google_play.py         # Google Play scraper service & ID parser
│   │   ├── apple_app_store.py     # Apple iTunes lookup & RSS reviews service
│   │   └── dashboard.py           # Unified aggregation & rating comparisons
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── responses.py           # Pydantic response models
│   ├── tests/
│   │   └── test_backend.py        # Automated test suite
│   ├── .env                       # Backend environment configuration
│   ├── .env.example
│   ├── requirements.txt           # Python backend dependencies
│   └── main.py                    # FastAPI application entrypoint & CORS
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx         # Top bar with active app pill & refresh
│   │   │   ├── Sidebar.tsx        # Left navigation & backend status
│   │   │   ├── StoreCard.tsx      # Google Play & Apple App Store cards
│   │   │   ├── RatingComparison.tsx # Recharts comparison on 0-5 scale
│   │   │   ├── RatingDistributionChart.tsx # Sample star distribution
│   │   │   ├── FilterBar.tsx      # Multi-dimensional filter & search bar
│   │   │   ├── RecentReviews.tsx  # Chronological reviews feed & pagination
│   │   │   ├── AppSelectorModal.tsx # Search and manual app configuration
│   │   │   ├── SettingsView.tsx   # System settings & provider inspection
│   │   │   └── Toast.tsx          # Real-time toast notifications
│   │   ├── pages/
│   │   │   └── DashboardPage.tsx  # Main analytics view coordinator
│   │   ├── services/
│   │   │   └── api.ts             # REST API client
│   │   ├── types/
│   │   │   ├── index.ts           # TypeScript interfaces & presets
│   │   │   └── vite-env.d.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css              # Tailwind styles
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts             # Vite configuration with /api proxy
└── README.md
```

---

## Installation & Setup

### Prerequisites

- **Python 3.10+** (with `pip`)
- **Node.js v18+** (with `npm`)

---

### Step 1: Backend Setup

Open a Windows PowerShell terminal in the project root:

```powershell
cd d:\sentiment_analyser\backend

# (Optional) Create and activate a Python virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install backend dependencies
pip install -r requirements.txt
```

Verify backend configuration in `backend/.env`:
```env
HOST=127.0.0.1
PORT=8000
DEFAULT_COUNTRY=in
DEFAULT_REVIEW_COUNT=30
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
REQUEST_TIMEOUT_SECONDS=15
```

---

### Step 2: Frontend Setup

Open a second Windows PowerShell terminal:

```powershell
cd d:\sentiment_analyser\frontend

# Install dependencies
npm install

# Test production build
npm run build
```

---

## Running the Application

### 1. Start the FastAPI Backend

In the backend terminal, run:

```powershell
# From project root
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend starts at `http://127.0.0.1:8000`. You can visit:
- API Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Health Check: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

### 2. Start the React Frontend

In the frontend terminal, run:

```powershell
cd d:\sentiment_analyser\frontend
npm run dev
```

The frontend runs at:
- Web App: [http://localhost:5173](http://localhost:5173)

---

## Running Automated Tests

Run the backend test suite:

```powershell
python -m pytest backend/tests/test_backend.py -v
```

All 8 tests verify:
- Health check endpoint `/api/health`
- Input parameter validation
- Search across stores with real queries
- Google Play live metadata retrieval (boAt Hearables `com.boAt.hearables`)
- Apple App Store live metadata retrieval (boAt Hearables `1592550875`)
- Unsupported platform validation (HTTP 400)
- Graceful error handling for non-existent app IDs (returns descriptive error payload without crashing)
- Unified dashboard dual-store endpoint (`/api/dashboard/unified`)

---

## Default Example Configuration: boAt Hearables

By default, the application launches with the following pre-configured identifiers:
- **App Name:** boAt Hearables
- **Google Play Package ID:** `com.boAt.hearables`
- **Apple App Store ID:** `1592550875`
- **Default Country:** India (`in`)

To switch to other apps, click **"Change"** in the top navigation bar or select any preset from the **"Presets"** dropdown.

---

## Data Collection Architecture & API Limitations

1. **Google Play Store:**
   - Google's official Developer API is strictly restricted to apps owned and managed by the authorized developer account.
   - For public apps, `google-play-scraper` scrapes Google Play's public web storefront.
   - Scraping endpoints may be subject to layout variations or rate limits by Google. The backend implements fallback package resolution and timeouts to ensure stability.
2. **Apple App Store:**
   - Apple provides the public iTunes Lookup API (`https://itunes.apple.com/lookup`) which reports official overall rating score and user rating count. It does *not* provide total written reviews count.
   - For recent customer reviews, the application queries Apple's public RSS JSON feed (`https://itunes.apple.com/{country}/rss/customerreviews/id={app_id}/sortBy=mostRecent/json`).
   - Apple's RSS feed returns a rolling window of recent reviews (up to 50 per page). It does not provide historical pagination back to the inception of the app.
3. **Rating Integrity:**
   - The overall rating displayed on cards and the comparison chart represents the **official storewide average** reported by the respective platforms.
   - The application does not calculate an average of the 30 fetched recent reviews and misrepresent it as the store's overall rating.
