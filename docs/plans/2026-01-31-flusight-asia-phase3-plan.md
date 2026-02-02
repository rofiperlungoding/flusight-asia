---
title: "FluSight-Asia Phase 3: Geographic Visualization"
phase: 3
status: in-progress
created: 2026-01-31
---

# Phase 3: Geographic Visualization

## Overview
Add interactive Leaflet map showing H3N2 spread across Asia.

---

## Tasks

### Task 3.1: Link Sequences to Locations ⬜
**Goal:** Parse country from strain names and update location_id

**Acceptance Criteria:**
- [ ] Parse country from strain name (e.g., A/India/... → India)
- [ ] Update sequences.location_id via SQL
- [ ] Pipeline auto-links new sequences

---

### Task 3.2: Geographic Data Hook ⬜
**Goal:** Fetch sequence counts by location

**Files:**
- `frontend/src/hooks/useGeography.ts`

**Acceptance Criteria:**
- [ ] Returns location with lat/lng and counts
- [ ] Aggregates mutation data per location

---

### Task 3.3: Interactive Map Component ⬜
**Goal:** Leaflet map with circle markers

**Files:**
- `frontend/src/components/Map/FluMap.tsx`
- `frontend/src/components/Map/LocationMarker.tsx`

**Acceptance Criteria:**
- [ ] Circle markers sized by sequence count
- [ ] Color gradient by mutation density
- [ ] Click marker to see details

---

### Task 3.4: Map Page ⬜
**Goal:** Full page with map and filters

**Files:**
- `frontend/src/pages/Map.tsx`

**Acceptance Criteria:**
- [ ] Map centered on Asia
- [ ] Filter by date range
- [ ] Stats sidebar

---

## Order
1. Task 3.1 → 2. Task 3.2 → 3. Task 3.3 → 4. Task 3.4
