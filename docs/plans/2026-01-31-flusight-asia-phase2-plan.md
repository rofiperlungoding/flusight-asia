---
title: "FluSight-Asia Phase 2: Data Integration & Live Dashboard"
phase: 2
status: complete
created: 2026-01-31
---

# Phase 2: Data Integration & Live Dashboard

## Overview
Connect the pipeline to Supabase and bring the dashboard to life with real data.

---

## Tasks

### Task 2.1: Supabase Writer Module ✅
**Goal:** Write fetched sequences directly to Supabase database

**Files:**
- `pipeline/src/flusight/storage/supabase_writer.py`
- Update `pipeline/.github/workflows/pipeline.yml`

**Acceptance Criteria:**
- [x] Sequences are upserted (no duplicates by genbank_id)
- [x] Location matching against existing locations table
- [x] Pipeline logs job status to `pipeline_logs` table

---

### Task 2.2: Mutation Detection Module ✅
**Goal:** Detect mutations by comparing sequences to reference strain

**Files:**
- `pipeline/src/flusight/processing/mutation_detector.py`
- `pipeline/src/flusight/processing/reference_strains.py`

**Acceptance Criteria:**
- [x] Compare amino acid sequences position-by-position
- [x] Identify antigenic site mutations (A, B, C, D, E)
- [x] Flag novel mutations not seen before
- [x] Store mutations in `mutations` table

---

### Task 2.3: Frontend Data Hooks ✅
**Goal:** Create React Query hooks to fetch live data from Supabase

**Files:**
- `frontend/src/hooks/useSequences.ts`
- `frontend/src/hooks/usePredictions.ts`
- `frontend/src/hooks/useStats.ts`

**Acceptance Criteria:**
- [x] Real-time sequence count on dashboard
- [x] Latest sequences in table view
- [x] Stats cards show live data

---

### Task 2.4: Connect Dashboard to Live Data ✅
**Goal:** Replace mock data with real Supabase queries

**Files:**
- Update `frontend/src/pages/Dashboard.tsx`
- Update `frontend/src/pages/Sequences.tsx`

**Acceptance Criteria:**
- [x] Dashboard shows real sequence count
- [x] Sequences page displays paginated data
- [x] Loading and empty states work correctly

---

### Task 2.5: Sequence Detail View ✅
**Goal:** View individual sequence with mutation analysis

**Files:**
- `frontend/src/pages/SequenceDetail.tsx`
- `frontend/src/components/SequenceViewer.tsx`
- `frontend/src/components/MutationTable.tsx`

**Acceptance Criteria:**
- [x] Click sequence row to view details
- [x] Display raw sequence with highlighting
- [x] Show detected mutations

---

## Order of Implementation
1. Task 2.1 (Supabase Writer) ✅
2. Task 2.3 (Frontend Hooks) ✅
3. Task 2.4 (Connect Dashboard) ✅
4. Task 2.2 (Mutation Detection) ✅
5. Task 2.5 (Detail View) ✅
