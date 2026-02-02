# Phase 5: Advanced Visualization & Alerts Implementation Plan

**Goal:** Transform the dashboard into a professional situational awareness tool with advanced map clustering, temporal trend analysis, and real-time mutation alerts.

**Architecture:** 
- **Map:** Upgrade to `react-leaflet-cluster` for handling high-density data (1000+ sequences).
- **Charts:** Implement `recharts` for temporal sequence tracking (Sequences per Month).
- **Alerts:** Build a Real-time Notification Center using Supabase Realtime subscriptions on the `mutations` table to flag critical variants.

**Tech Stack:** React, Leaflet, Recharts, Supabase Realtime, TailwindCSS.

---

### Task 5.1: Marker Clustering
**Files:**
- Create: `frontend/src/components/Map/ClusterMap.tsx`
- Modify: `frontend/src/types/react-leaflet.d.ts` (if needed for cluster types)
- Modify: `frontend/src/pages/Dashboard.tsx`

**Step 1: Install dependencies**
Run: `npm install react-leaflet-cluster leaflet.markercluster`

**Step 2: Create ClusterMap component**
Implement `MapContainer` wrapping `MarkerClusterGroup` to handle thousands of sequence markers efficiently.

**Step 3: Replace FluMap in Dashboard**
Swap the basic `FluMap` with `ClusterMap` in `Dashboard.tsx`.

**Step 4: Verify**
Check if map handles 1000+ points smoothly without lag.

### Task 5.2: Temporal Trends Chart
**Files:**
- Create: `frontend/src/components/Charts/TemporalTrendChart.tsx`
- Modify: `frontend/src/pages/Dashboard.tsx`

**Step 1: Install Recharts**
Run: `npm install recharts`

**Step 2: Create TemporalTrendChart**
Implement a Bar/Line chart showing "Sequences Collected" over the last 12 months, grouped by month.

**Step 3: Integrate into Dashboard**
Add the chart to the "Regional Spread Forecast" container (replacing the placeholder).

**Step 4: Verify**
Ensure chart renders correct data from Supabase.

### Task 5.3: Real-time Mutation Alerts
**Files:**
- Create: `frontend/src/components/Alerts/NotificationCenter.tsx`
- Modify: `frontend/src/components/Layout/Navbar.tsx` (to add bell icon)
- Modify: `frontend/src/hooks/useAlerts.ts`

**Step 1: Create useAlerts hook**
Subscribe to `INSERT` on `mutations` table. Filter for high-priority mutations (e.g., specific sites like 135, 138, 142, 144, 153 for H3N2).

**Step 2: Create NotificationCenter UI**
A dropdown/panel showing list of recent critical mutations.

**Step 3: Integrate Bell Icon**
Add to Navbar with unread count badge.

**Step 4: Verify**
Simulate a mutation insert and check if alert pops up.
