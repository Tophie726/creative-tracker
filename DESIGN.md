# Creative Performance Tracker - Design & Philosophy

## Overview

A lightweight web app that allows Amazon Ads partners to upload their bulk reports and visualize creative performance across different video/image assets.

## Design Philosophy

### 1. Simplicity First
- Single file upload, instant results
- No account required for MVP (save functionality comes later with Supabase)
- Clean, minimal UI that focuses on the data

### 2. Data-Driven Insights
- Connect creative assets to their performance metrics
- Allow manual labeling (Creative Name + Category) to group similar creatives
- Aggregate performance by these labels for meaningful comparisons

### 3. Partner-Friendly
- Works with standard Amazon Advertising bulk reports
- No technical knowledge required
- Visual media previews where possible

---

## Data Flow

```
Amazon Ads Console
       ↓
Download Bulk Report (.xlsx)
   - Brand Assets Data (Read-only)
   - SB Multi Ad Group Campaigns
       ↓
Upload to Creative Tracker
       ↓
Parse & Extract:
   1. Brand Assets → Media Library (videos, images)
   2. Campaign Data → Performance metrics
       ↓
User Labels Creatives:
   - Creative Name (e.g., "Lady", "Video 1")
   - Category (e.g., "Back Pain", "Product Demo")
       ↓
View Aggregated Performance:
   - Group by Creative Name
   - Group by Category
   - See metrics: Impressions, Clicks, CTR, Spend, Sales, Orders, Conv Rate, ROAS
```

---

## Key Data Connections

### Linking Column: `Video Asset IDs`
- Found in: SB Multi Ad Group Campaigns
- Links to: `Asset ID` in Brand Assets Data
- This is how we connect performance data to specific video/image creatives

### ID Hierarchy
```
Campaign ID
  └─ Ad Group ID
       └─ Ad ID (contains Video Asset IDs)
            └─ Keyword ID / Product Targeting ID
```

---

## Features

### Tab 1: Upload
- Drag & drop or click to upload
- Accepts .xlsx bulk reports
- Validates required sheets exist

### Tab 2: Media Library
- Grid view of all assets (videos & images)
- Preview with fallback (thumbnail or icon)
- Label each asset:
  - Creative Name (free text)
  - Category (dropdown, can add new)
- Filter by type (all/video/image)
- Stats: Total assets, Videos, Images, Labeled count

### Tab 3: Performance Dashboard
- Summary cards: Impressions, Clicks, Spend, Sales, Orders, ROAS
- Grouping options:
  - By Creative Name
  - By Category
  - By Video ID (raw)
- Sortable columns
- Expandable category groups (nested view)
- Color-coded ROAS (green if >= 1, red if < 1)

---

## Tab 4: A/B Test View

### Purpose
Show creatives competing for the same target (keyword or ASIN) and identify winners.

### Grouping Options
1. **By Keyword** - Group all ads targeting the same keyword text
2. **By ASIN** - Group all ads targeting the same product ASIN

### Display Format
For each target, show:
- Target name (keyword text or ASIN)
- Match type (for keywords: Exact, Phrase, Broad)
- All creatives competing on that target
- Performance metrics for each creative
- Winner badge (highest ROAS with minimum spend threshold)

### Example: Keyword View
```
Keyword: "push broom outdoor" (Exact)
├─ Video 1 "Lady" (ROAS: 2.5, Spend: $150) ← Winner
├─ Video 2 "Demo" (ROAS: 1.2, Spend: $200)
└─ Video 3 "Lifestyle" (ROAS: 0.8, Spend: $50)
```

### Example: ASIN View
```
ASIN: B08XYZ123 (Competitor Product)
├─ Video 1 "Lady" (ROAS: 3.1, Spend: $80) ← Winner
└─ Video 2 "Product" (ROAS: 1.5, Spend: $45)
```

### Winner Criteria
- Must have minimum $10 spend (configurable)
- Highest ROAS among competing creatives
- Color-coded: Green for winner, neutral for others

### Filters
- Show only targets with 2+ creatives (actual A/B tests)
- Filter by minimum impressions
- Sort by spend, impressions, or ROAS delta

---

## Future Enhancements

### Supabase Integration (Planned)
- Save labeled data to database
- User sessions via email
- Historical data tracking
- Connect to Sophie Hub v2

---

## Tech Stack

- **Vite** - Fast dev server & build
- **React + TypeScript** - UI framework
- **Tailwind CSS** - Styling
- **xlsx** - Excel parsing
- **Lucide React** - Icons

---

## File Structure

```
/src
  /components
    FileUpload.tsx      - Drag & drop upload
    MediaLibrary.tsx    - Asset grid with labeling
    PerformanceDashboard.tsx - Metrics table
  /utils
    parseExcel.ts       - Excel parsing logic
  types.ts              - TypeScript interfaces
  App.tsx               - Main app with tabs
  index.css             - Tailwind imports
```

---

## Required Bulk Report Settings

When downloading from Amazon Advertising, ensure these are checked:
- Brand assets data
- Sponsored Brands multi-ad group data

Optional but useful:
- Terminated campaigns
- Paused campaigns
- Campaign items with zero impressions
