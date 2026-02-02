# FluSight-Asia: Phase 1 Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up the foundational infrastructure — Supabase database, Vite+React frontend shell, and basic NCBI data ingestion.

**Architecture:** Monorepo structure with `/frontend` (Vite+React), `/pipeline` (Python), and `/supabase` (migrations/functions). GitHub Actions for CI/CD.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind CSS, Supabase, Python 3.11, BioPython

---

## Task 1: Initialize Project Repository

**Files:**
- Create: `README.md`
- Create: `.gitignore`
- Create: `package.json` (workspace root)

**Step 1: Create the project directory and initialize git**

```bash
mkdir flusight-asia
cd flusight-asia
git init
```

**Step 2: Create README.md**

```markdown
# FluSight-Asia

H3N2 Influenza Mutation Intelligence Platform for Asia.

## Overview

Enterprise-grade ML platform for predicting H3N2 influenza virus mutations. Serves researchers, healthcare agencies, and academics through real-time dashboard, REST API, and research export tools.

## Tech Stack

- **Frontend:** Vite + React 18 + TypeScript + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **ML Pipeline:** Python + PyTorch + BioPython
- **Hosting:** Netlify (frontend) + Hugging Face Spaces (ML)

## Project Structure

```
flusight-asia/
├── frontend/          # Vite + React dashboard
├── pipeline/          # Python data & ML pipeline
├── supabase/          # Database migrations & edge functions
└── .github/           # GitHub Actions workflows
```

## License

MIT
```

**Step 3: Create .gitignore**

```gitignore
# Dependencies
node_modules/
__pycache__/
*.pyc
.venv/
venv/

# Build outputs
dist/
build/
*.egg-info/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Test coverage
coverage/
.coverage
htmlcov/

# Supabase
.supabase/

# ML artifacts
*.pt
*.pth
*.onnx
wandb/
```

**Step 4: Create root package.json for workspace**

```json
{
  "name": "flusight-asia",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "frontend"
  ],
  "scripts": {
    "dev": "npm run dev --workspace=frontend",
    "build": "npm run build --workspace=frontend",
    "lint": "npm run lint --workspace=frontend"
  }
}
```

**Step 5: Commit**

```bash
git add .
git commit -m "chore: initialize project repository"
```

---

## Task 2: Set Up Supabase Project

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/00001_initial_schema.sql`

**Step 1: Create Supabase project (manual step)**

> **Manual Action Required:**
> 1. Go to https://supabase.com and create a new project
> 2. Name it `flusight-asia`
> 3. Choose a strong database password
> 4. Select the region closest to Asia (e.g., Singapore)
> 5. Copy the project URL and anon key for later

**Step 2: Install Supabase CLI locally (if not installed)**

```bash
npm install -g supabase
```

**Step 3: Initialize Supabase in project**

```bash
mkdir supabase
cd supabase
supabase init
```

**Step 4: Create initial database migration**

Create file: `supabase/migrations/00001_initial_schema.sql`

```sql
-- FluSight-Asia Initial Schema
-- Version: 1.0.0

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search

-- =============================================================================
-- LOCATIONS TABLE
-- =============================================================================
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country VARCHAR(100) NOT NULL,
    country_code VARCHAR(3),
    region VARCHAR(50) DEFAULT 'Asia',
    subregion VARCHAR(100),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(country, subregion)
);

-- Index for geographic queries
CREATE INDEX idx_locations_country ON locations(country);
CREATE INDEX idx_locations_region ON locations(region);

-- =============================================================================
-- SEQUENCES TABLE
-- =============================================================================
CREATE TABLE sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- External identifiers
    gisaid_id VARCHAR(50) UNIQUE,
    genbank_id VARCHAR(50),
    
    -- Strain information
    strain_name VARCHAR(255) NOT NULL,
    segment VARCHAR(10) DEFAULT 'HA',
    subtype VARCHAR(10) DEFAULT 'H3N2',
    
    -- Sequence data
    raw_sequence TEXT NOT NULL,
    sequence_length INTEGER NOT NULL,
    amino_acid_sequence TEXT,
    
    -- Collection metadata
    collection_date DATE NOT NULL,
    location_id UUID REFERENCES locations(id),
    host VARCHAR(50) DEFAULT 'Human',
    
    -- Classification
    clade VARCHAR(50),
    lineage VARCHAR(100),
    
    -- Quality metrics
    quality_score CHAR(1) CHECK (quality_score IN ('A', 'B', 'C', 'D')),
    ambiguity_percentage DECIMAL(5, 2),
    
    -- Computed features
    vaccine_strain_distance DECIMAL(8, 6),
    feature_vector JSONB,
    
    -- Audit fields
    source VARCHAR(50) NOT NULL,  -- 'gisaid', 'ncbi', 'who'
    ingestion_batch VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX idx_sequences_collection_date ON sequences(collection_date DESC);
CREATE INDEX idx_sequences_clade ON sequences(clade);
CREATE INDEX idx_sequences_location ON sequences(location_id);
CREATE INDEX idx_sequences_quality ON sequences(quality_score);
CREATE INDEX idx_sequences_strain_name ON sequences USING gin(strain_name gin_trgm_ops);
CREATE INDEX idx_sequences_gisaid ON sequences(gisaid_id) WHERE gisaid_id IS NOT NULL;

-- =============================================================================
-- MUTATIONS TABLE
-- =============================================================================
CREATE TABLE mutations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    
    -- Mutation details
    position INTEGER NOT NULL,
    reference_aa CHAR(1) NOT NULL,
    variant_aa CHAR(1) NOT NULL,
    mutation_notation VARCHAR(20) NOT NULL,  -- e.g., "K144N"
    
    -- Classification
    is_synonymous BOOLEAN DEFAULT FALSE,
    antigenic_site CHAR(1) CHECK (antigenic_site IN ('A', 'B', 'C', 'D', 'E')),
    is_novel BOOLEAN DEFAULT FALSE,
    
    -- Impact assessment
    is_escape_mutation BOOLEAN DEFAULT FALSE,
    functional_impact VARCHAR(50),  -- 'neutral', 'deleterious', 'beneficial'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(sequence_id, position)
);

-- Indexes for mutation analysis
CREATE INDEX idx_mutations_sequence ON mutations(sequence_id);
CREATE INDEX idx_mutations_position ON mutations(position);
CREATE INDEX idx_mutations_antigenic_site ON mutations(antigenic_site) WHERE antigenic_site IS NOT NULL;
CREATE INDEX idx_mutations_novel ON mutations(is_novel) WHERE is_novel = TRUE;

-- =============================================================================
-- PREDICTIONS TABLE
-- =============================================================================
CREATE TABLE predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Prediction metadata
    prediction_type VARCHAR(50) NOT NULL,  -- 'dominant_strain', 'vaccine_match', 'spread', 'mutations'
    model_version VARCHAR(20) NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Forecast horizon
    forecast_date DATE NOT NULL,  -- The date being predicted FOR
    horizon_weeks INTEGER,
    
    -- Prediction content (flexible JSONB for different prediction types)
    prediction_data JSONB NOT NULL,
    
    -- Confidence metrics
    confidence_lower DECIMAL(5, 4),
    confidence_upper DECIMAL(5, 4),
    
    -- Validation (filled in after the fact)
    actual_outcome JSONB,
    accuracy_score DECIMAL(5, 4),
    validated_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for prediction queries
CREATE INDEX idx_predictions_type ON predictions(prediction_type);
CREATE INDEX idx_predictions_date ON predictions(forecast_date DESC);
CREATE INDEX idx_predictions_generated ON predictions(generated_at DESC);
CREATE INDEX idx_predictions_model ON predictions(model_version);

-- =============================================================================
-- PIPELINE LOGS TABLE (for observability)
-- =============================================================================
CREATE TABLE pipeline_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Job information
    job_name VARCHAR(100) NOT NULL,
    job_id VARCHAR(100),
    batch_id VARCHAR(100),
    
    -- Status
    status VARCHAR(20) NOT NULL,  -- 'started', 'running', 'completed', 'failed'
    
    -- Metrics
    records_processed INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    duration_seconds INTEGER,
    
    -- Details
    message TEXT,
    error_details JSONB,
    
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Index for log queries
CREATE INDEX idx_pipeline_logs_job ON pipeline_logs(job_name);
CREATE INDEX idx_pipeline_logs_status ON pipeline_logs(status);
CREATE INDEX idx_pipeline_logs_started ON pipeline_logs(started_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE mutations ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_logs ENABLE ROW LEVEL SECURITY;

-- Public read access for sequences and predictions (unauthenticated)
CREATE POLICY "Public read access for locations" ON locations
    FOR SELECT USING (true);

CREATE POLICY "Public read access for sequences" ON sequences
    FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Public read access for mutations" ON mutations
    FOR SELECT USING (true);

CREATE POLICY "Public read access for predictions" ON predictions
    FOR SELECT USING (true);

-- Service role can do everything (for pipeline)
CREATE POLICY "Service role full access locations" ON locations
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access sequences" ON sequences
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access mutations" ON mutations
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access predictions" ON predictions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access pipeline_logs" ON pipeline_logs
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- SEED DATA: Asian Locations
-- =============================================================================
INSERT INTO locations (country, country_code, subregion, latitude, longitude) VALUES
    ('China', 'CHN', 'East China', 31.2304, 121.4737),
    ('China', 'CHN', 'South China', 23.1291, 113.2644),
    ('China', 'CHN', 'North China', 39.9042, 116.4074),
    ('Japan', 'JPN', NULL, 35.6762, 139.6503),
    ('South Korea', 'KOR', NULL, 37.5665, 126.9780),
    ('Taiwan', 'TWN', NULL, 25.0330, 121.5654),
    ('Singapore', 'SGP', NULL, 1.3521, 103.8198),
    ('Thailand', 'THA', NULL, 13.7563, 100.5018),
    ('Vietnam', 'VNM', NULL, 21.0278, 105.8342),
    ('Malaysia', 'MYS', NULL, 3.1390, 101.6869),
    ('Indonesia', 'IDN', NULL, -6.2088, 106.8456),
    ('Philippines', 'PHL', NULL, 14.5995, 120.9842),
    ('India', 'IND', NULL, 28.6139, 77.2090),
    ('Bangladesh', 'BGD', NULL, 23.8103, 90.4125),
    ('Hong Kong', 'HKG', NULL, 22.3193, 114.1694);

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sequences_updated_at 
    BEFORE UPDATE ON sequences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Step 5: Run migration locally (optional, for testing)**

```bash
supabase start
supabase db push
```

**Step 6: Commit**

```bash
git add supabase/
git commit -m "feat: add initial Supabase schema with sequences, mutations, predictions tables"
```

---

## Task 3: Set Up Vite + React + TypeScript Frontend

**Files:**
- Create: `frontend/` directory with Vite template
- Create: `frontend/src/lib/supabase.ts`
- Modify: `frontend/tailwind.config.js`

**Step 1: Create Vite project**

```bash
cd flusight-asia
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

**Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @tanstack/react-query zustand react-router-dom recharts leaflet react-leaflet
npm install -D tailwindcss postcss autoprefixer @types/leaflet
npx tailwindcss init -p
```

**Step 3: Configure Tailwind CSS**

Update `frontend/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // FluSight-Asia Brand Colors
        primary: {
          DEFAULT: '#0D9488',  // Teal
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },
        secondary: {
          DEFAULT: '#3B82F6',  // Blue
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        danger: '#EF4444',
        warning: '#F59E0B',
        success: '#10B981',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
```

**Step 4: Update CSS entry point**

Update `frontend/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Import fonts */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

/* Base styles */
@layer base {
  html {
    @apply antialiased;
  }
  
  body {
    @apply bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100;
    @apply font-sans;
  }
}

/* Component styles */
@layer components {
  .btn-primary {
    @apply bg-primary-600 hover:bg-primary-700 text-white;
    @apply px-4 py-2 rounded-lg font-medium;
    @apply transition-colors duration-200;
    @apply focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2;
  }
  
  .btn-secondary {
    @apply bg-secondary-600 hover:bg-secondary-700 text-white;
    @apply px-4 py-2 rounded-lg font-medium;
    @apply transition-colors duration-200;
  }
  
  .card {
    @apply bg-white dark:bg-gray-800;
    @apply rounded-xl shadow-sm border border-gray-200 dark:border-gray-700;
    @apply p-6;
  }

  .sequence-display {
    @apply font-mono text-sm;
    @apply bg-gray-50 dark:bg-gray-900;
    @apply p-4 rounded-lg overflow-x-auto;
  }
}
```

**Step 5: Create Supabase client**

Create `frontend/src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions for database tables
export interface Location {
  id: string;
  country: string;
  country_code: string | null;
  region: string;
  subregion: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface Sequence {
  id: string;
  gisaid_id: string | null;
  genbank_id: string | null;
  strain_name: string;
  segment: string;
  subtype: string;
  raw_sequence: string;
  sequence_length: number;
  amino_acid_sequence: string | null;
  collection_date: string;
  location_id: string | null;
  host: string;
  clade: string | null;
  lineage: string | null;
  quality_score: 'A' | 'B' | 'C' | 'D' | null;
  vaccine_strain_distance: number | null;
  source: string;
  created_at: string;
}

export interface Mutation {
  id: string;
  sequence_id: string;
  position: number;
  reference_aa: string;
  variant_aa: string;
  mutation_notation: string;
  is_synonymous: boolean;
  antigenic_site: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  is_novel: boolean;
}

export interface Prediction {
  id: string;
  prediction_type: string;
  model_version: string;
  generated_at: string;
  forecast_date: string;
  horizon_weeks: number | null;
  prediction_data: Record<string, unknown>;
  confidence_lower: number | null;
  confidence_upper: number | null;
}
```

**Step 6: Create environment file template**

Create `frontend/.env.example`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Step 7: Verify it runs**

```bash
cd frontend
npm run dev
```

Expected: Vite dev server starts at http://localhost:5173

**Step 8: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat: set up Vite + React + TypeScript with Tailwind and Supabase client"
```

---

## Task 4: Create Dashboard Layout Shell

**Files:**
- Create: `frontend/src/components/Layout/`
- Create: `frontend/src/pages/`
- Modify: `frontend/src/App.tsx`

**Step 1: Create Layout components**

Create `frontend/src/components/Layout/Sidebar.tsx`:

```tsx
import { Link, useLocation } from 'react-router-dom';

const navigation = [
  { name: 'Dashboard', href: '/', icon: '📊' },
  { name: 'Predictions', href: '/predictions', icon: '🔮' },
  { name: 'Sequences', href: '/sequences', icon: '🧬' },
  { name: 'Research', href: '/research', icon: '📚' },
  { name: 'API Docs', href: '/api-docs', icon: '📖' },
  { name: 'Settings', href: '/settings', icon: '⚙️' },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="flex flex-col w-64 bg-gray-900 text-white">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-gray-700">
        <span className="text-xl font-bold text-primary-400">🧬 FluSight</span>
        <span className="ml-1 text-sm text-gray-400">Asia</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`
                flex items-center px-4 py-3 rounded-lg text-sm font-medium
                transition-colors duration-200
                ${isActive 
                  ? 'bg-primary-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }
              `}
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-700">
        <div className="text-xs text-gray-500">
          <p>© 2026 FluSight-Asia</p>
          <p className="mt-1">v0.1.0</p>
        </div>
      </div>
    </div>
  );
}
```

Create `frontend/src/components/Layout/Header.tsx`:

```tsx
import { useState } from 'react';

export function Header() {
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between h-full px-6">
        {/* Search */}
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <input
              type="text"
              placeholder="Search sequences, strains..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                         bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="relative p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <span className="text-xl">🔔</span>
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <span className="text-xl">{darkMode ? '☀️' : '🌙'}</span>
          </button>

          {/* User menu */}
          <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              U
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
```

Create `frontend/src/components/Layout/MainLayout.tsx`:

```tsx
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function MainLayout() {
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

Create `frontend/src/components/Layout/index.ts`:

```typescript
export { MainLayout } from './MainLayout';
export { Sidebar } from './Sidebar';
export { Header } from './Header';
```

**Step 2: Create placeholder pages**

Create `frontend/src/pages/Dashboard.tsx`:

```tsx
export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          H3N2 Influenza Mutation Intelligence for Asia
        </p>
      </div>

      {/* Alert banner placeholder */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
        <div className="flex items-center">
          <span className="text-yellow-500 mr-3">⚠️</span>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            <strong>No data yet.</strong> Run the data pipeline to fetch sequences from NCBI.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Dominant Strain</h3>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">--</p>
          <p className="mt-1 text-sm text-gray-500">No data</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Vaccine Match</h3>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">--%</p>
          <p className="mt-1 text-sm text-gray-500">No data</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Sequences</h3>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">0</p>
          <p className="mt-1 text-sm text-gray-500">Last updated: Never</p>
        </div>
      </div>

      {/* Placeholder charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Geographic Spread Map</h3>
          <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400">
            Map will appear here
          </div>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Variant Trends</h3>
          <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400">
            Chart will appear here
          </div>
        </div>
      </div>
    </div>
  );
}
```

Create `frontend/src/pages/Predictions.tsx`:

```tsx
export function Predictions() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Predictions</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          ML model forecasts for virus mutations and spread
        </p>
      </div>
      <div className="card">
        <p className="text-gray-500">Predictions will appear here once the ML pipeline is running.</p>
      </div>
    </div>
  );
}
```

Create `frontend/src/pages/Sequences.tsx`:

```tsx
export function Sequences() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sequences</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Browse and analyze H3N2 sequences
        </p>
      </div>
      <div className="card">
        <p className="text-gray-500">Sequence browser will appear here once data is imported.</p>
      </div>
    </div>
  );
}
```

Create `frontend/src/pages/index.ts`:

```typescript
export { Dashboard } from './Dashboard';
export { Predictions } from './Predictions';
export { Sequences } from './Sequences';
```

**Step 3: Update App.tsx with routing**

Update `frontend/src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from './components/Layout';
import { Dashboard, Predictions, Sequences } from './pages';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/sequences" element={<Sequences />} />
            <Route path="/research" element={<div className="p-6">Research - Coming Soon</div>} />
            <Route path="/api-docs" element={<div className="p-6">API Docs - Coming Soon</div>} />
            <Route path="/settings" element={<div className="p-6">Settings - Coming Soon</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
```

**Step 4: Verify the dashboard runs**

```bash
cd frontend
npm run dev
```

Expected: Dashboard shell with sidebar navigation at http://localhost:5173

**Step 5: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat: add dashboard layout shell with sidebar, header, and page routing"
```

---

## Task 5: Set Up Python Pipeline Environment

**Files:**
- Create: `pipeline/` directory structure
- Create: `pipeline/pyproject.toml`
- Create: `pipeline/src/flusight/`

**Step 1: Create pipeline directory structure**

```bash
mkdir -p pipeline/src/flusight/{ingestion,processing,models,utils}
mkdir -p pipeline/tests
```

**Step 2: Create pyproject.toml**

Create `pipeline/pyproject.toml`:

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "flusight-pipeline"
version = "0.1.0"
description = "FluSight-Asia data and ML pipeline"
readme = "README.md"
requires-python = ">=3.11"
dependencies = [
    "biopython>=1.83",
    "requests>=2.31.0",
    "supabase>=2.0.0",
    "python-dotenv>=1.0.0",
    "pandas>=2.1.0",
    "numpy>=1.26.0",
    "tqdm>=4.66.0",
    "pydantic>=2.5.0",
    "httpx>=0.26.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "pytest-cov>=4.1.0",
    "ruff>=0.1.0",
    "mypy>=1.7.0",
]
ml = [
    "torch>=2.1.0",
    "transformers>=4.36.0",
    "pytorch-geometric>=2.4.0",
]

[project.scripts]
flusight = "flusight.cli:main"

[tool.hatch.build.targets.wheel]
packages = ["src/flusight"]

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W"]

[tool.mypy]
python_version = "3.11"
strict = true

[tool.pytest.ini_options]
testpaths = ["tests"]
```

**Step 3: Create package init files**

Create `pipeline/src/flusight/__init__.py`:

```python
"""FluSight-Asia: H3N2 Influenza Mutation Intelligence Platform."""

__version__ = "0.1.0"
```

Create `pipeline/src/flusight/ingestion/__init__.py`:

```python
"""Data ingestion connectors for NCBI, GISAID, WHO."""
```

Create `pipeline/src/flusight/processing/__init__.py`:

```python
"""Sequence processing, validation, and feature engineering."""
```

Create `pipeline/src/flusight/models/__init__.py`:

```python
"""Machine learning models for mutation prediction."""
```

Create `pipeline/src/flusight/utils/__init__.py`:

```python
"""Utility functions and shared helpers."""
```

**Step 4: Create Supabase client utility**

Create `pipeline/src/flusight/utils/database.py`:

```python
"""Supabase database client."""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()


def get_supabase_client() -> Client:
    """Get authenticated Supabase client."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")  # Use service key for pipeline
    
    if not url or not key:
        raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables")
    
    return create_client(url, key)


# Singleton client instance
_client: Client | None = None


def get_client() -> Client:
    """Get or create singleton Supabase client."""
    global _client
    if _client is None:
        _client = get_supabase_client()
    return _client
```

**Step 5: Create environment file template**

Create `pipeline/.env.example`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
NCBI_EMAIL=your-email@example.com
NCBI_API_KEY=your-ncbi-api-key-optional
```

**Step 6: Create virtual environment and verify**

```bash
cd pipeline
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -e ".[dev]"
```

Expected: Package installs successfully

**Step 7: Commit**

```bash
cd ..
git add pipeline/
git commit -m "feat: set up Python pipeline environment with project structure"
```

---

## Task 6: Implement NCBI Data Fetcher (Basic)

**Files:**
- Create: `pipeline/src/flusight/ingestion/ncbi.py`
- Create: `pipeline/tests/test_ncbi.py`

**Step 1: Write the failing test**

Create `pipeline/tests/test_ncbi.py`:

```python
"""Tests for NCBI data fetcher."""

import pytest
from flusight.ingestion.ncbi import NCBIFetcher


def test_ncbi_fetcher_initialization():
    """Test that NCBIFetcher initializes with required parameters."""
    fetcher = NCBIFetcher(email="test@example.com")
    assert fetcher.email == "test@example.com"
    assert fetcher.database == "nucleotide"


def test_build_search_query():
    """Test that search query is built correctly for H3N2 Asia."""
    fetcher = NCBIFetcher(email="test@example.com")
    query = fetcher.build_search_query(
        subtype="H3N2",
        segment="HA",
        region="Asia",
        min_date="2024-01-01"
    )
    
    assert "H3N2" in query
    assert "HA" in query
    assert "hemagglutinin" in query.lower() or "HA" in query


def test_parse_genbank_record():
    """Test parsing of a GenBank record."""
    # This test will use mock data
    fetcher = NCBIFetcher(email="test@example.com")
    
    # Mock GenBank record structure
    mock_record = {
        "id": "MN123456",
        "description": "Influenza A virus (A/Singapore/2024-0001(H3N2)) hemagglutinin (HA) gene",
        "seq": "ATGAAGACTATCATTGCTTTGAGCTACATTCTATGTCTGGTTTTCGCTCAAAAACTTCCCGGAAATGACAAC",
    }
    
    # Test will fail until we implement the parser
    parsed = fetcher.parse_record(mock_record)
    
    assert parsed["genbank_id"] == "MN123456"
    assert parsed["subtype"] == "H3N2"
    assert "Singapore" in parsed["strain_name"]
```

**Step 2: Run test to verify it fails**

```bash
cd pipeline
pytest tests/test_ncbi.py -v
```

Expected: FAIL with "ModuleNotFoundError" or "AttributeError"

**Step 3: Write the NCBI fetcher implementation**

Create `pipeline/src/flusight/ingestion/ncbi.py`:

```python
"""NCBI GenBank data fetcher for influenza sequences."""

import re
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Iterator

from Bio import Entrez, SeqIO
from Bio.SeqRecord import SeqRecord
import httpx

# Type alias for parsed sequence data
SequenceData = dict[str, str | int | float | None]


@dataclass
class NCBIFetcher:
    """Fetches influenza sequences from NCBI GenBank."""
    
    email: str
    api_key: str | None = None
    database: str = "nucleotide"
    batch_size: int = 100
    
    def __post_init__(self):
        """Configure Entrez with credentials."""
        Entrez.email = self.email
        if self.api_key:
            Entrez.api_key = self.api_key
    
    def build_search_query(
        self,
        subtype: str = "H3N2",
        segment: str = "HA",
        region: str | None = None,
        min_date: str | None = None,
        max_date: str | None = None,
    ) -> str:
        """Build NCBI search query for influenza sequences.
        
        Args:
            subtype: Influenza subtype (e.g., "H3N2")
            segment: Gene segment (e.g., "HA", "NA")
            region: Geographic region to filter by
            min_date: Minimum collection date (YYYY-MM-DD)
            max_date: Maximum collection date (YYYY-MM-DD)
            
        Returns:
            NCBI query string
        """
        # Base query for influenza A with specified subtype
        query_parts = [
            "Influenza A virus[Organism]",
            f"({subtype}[Title] OR {subtype}[All Fields])",
        ]
        
        # Add segment filter
        segment_terms = {
            "HA": "(hemagglutinin[Title] OR HA[Title] OR segment 4[Title])",
            "NA": "(neuraminidase[Title] OR NA[Title] OR segment 6[Title])",
        }
        if segment in segment_terms:
            query_parts.append(segment_terms[segment])
        
        # Add region filter (countries in Asia)
        if region and region.lower() == "asia":
            asian_countries = [
                "China", "Japan", "South Korea", "Taiwan", "Singapore",
                "Thailand", "Vietnam", "Malaysia", "Indonesia", "Philippines",
                "India", "Bangladesh", "Hong Kong"
            ]
            country_query = " OR ".join(f'"{c}"[All Fields]' for c in asian_countries)
            query_parts.append(f"({country_query})")
        
        # Add date filter
        if min_date:
            query_parts.append(f'{min_date}[PDAT] : 3000[PDAT]')
        
        # Filter for complete sequences only (reasonably long)
        query_parts.append("1500:2000[SLEN]")  # HA gene is ~1700bp
        
        return " AND ".join(query_parts)
    
    def search(self, query: str, max_results: int = 1000) -> list[str]:
        """Search NCBI and return list of accession IDs.
        
        Args:
            query: NCBI search query string
            max_results: Maximum number of results to return
            
        Returns:
            List of GenBank accession IDs
        """
        handle = Entrez.esearch(
            db=self.database,
            term=query,
            retmax=max_results,
            usehistory="y",
        )
        record = Entrez.read(handle)
        handle.close()
        
        return record["IdList"]
    
    def fetch_records(self, ids: list[str]) -> Iterator[SeqRecord]:
        """Fetch sequence records by ID in batches.
        
        Args:
            ids: List of GenBank accession IDs
            
        Yields:
            SeqRecord objects
        """
        for i in range(0, len(ids), self.batch_size):
            batch_ids = ids[i:i + self.batch_size]
            
            handle = Entrez.efetch(
                db=self.database,
                id=",".join(batch_ids),
                rettype="gb",
                retmode="text",
            )
            
            for record in SeqIO.parse(handle, "genbank"):
                yield record
            
            handle.close()
            
            # Rate limiting: NCBI allows 10 requests/second with API key, 3 without
            time.sleep(0.5)
    
    def parse_record(self, record: SeqRecord | dict) -> SequenceData:
        """Parse a GenBank record into our schema format.
        
        Args:
            record: BioPython SeqRecord or dict-like object
            
        Returns:
            Dictionary matching our sequence table schema
        """
        # Handle both SeqRecord and dict inputs (for testing)
        if isinstance(record, dict):
            return self._parse_dict_record(record)
        
        return self._parse_seqrecord(record)
    
    def _parse_dict_record(self, record: dict) -> SequenceData:
        """Parse a dictionary record (for testing)."""
        description = record.get("description", "")
        
        # Extract strain name from description
        strain_match = re.search(r'\(A/[^)]+\)', description)
        strain_name = strain_match.group(0)[1:-1] if strain_match else description
        
        # Extract subtype
        subtype = "H3N2" if "H3N2" in description else "Unknown"
        
        return {
            "genbank_id": record.get("id"),
            "strain_name": strain_name,
            "segment": "HA",
            "subtype": subtype,
            "raw_sequence": str(record.get("seq", "")),
            "sequence_length": len(record.get("seq", "")),
            "source": "ncbi",
        }
    
    def _parse_seqrecord(self, record: SeqRecord) -> SequenceData:
        """Parse a BioPython SeqRecord."""
        # Extract metadata from features and annotations
        strain_name = self._extract_strain_name(record)
        collection_date = self._extract_collection_date(record)
        country = self._extract_country(record)
        
        return {
            "genbank_id": record.id,
            "strain_name": strain_name,
            "segment": "HA",
            "subtype": "H3N2",
            "raw_sequence": str(record.seq),
            "sequence_length": len(record.seq),
            "collection_date": collection_date,
            "country": country,
            "host": self._extract_host(record),
            "source": "ncbi",
        }
    
    def _extract_strain_name(self, record: SeqRecord) -> str:
        """Extract strain name from record."""
        # Try features first
        for feature in record.features:
            if feature.type == "source":
                qualifiers = feature.qualifiers
                if "strain" in qualifiers:
                    return qualifiers["strain"][0]
                if "isolate" in qualifiers:
                    return qualifiers["isolate"][0]
        
        # Fall back to description parsing
        desc = record.description
        match = re.search(r'\(A/[^)]+\)', desc)
        if match:
            return match.group(0)[1:-1]
        
        return record.id
    
    def _extract_collection_date(self, record: SeqRecord) -> str | None:
        """Extract collection date from record."""
        for feature in record.features:
            if feature.type == "source":
                qualifiers = feature.qualifiers
                if "collection_date" in qualifiers:
                    date_str = qualifiers["collection_date"][0]
                    return self._normalize_date(date_str)
        return None
    
    def _extract_country(self, record: SeqRecord) -> str | None:
        """Extract country from record."""
        for feature in record.features:
            if feature.type == "source":
                qualifiers = feature.qualifiers
                if "country" in qualifiers:
                    country = qualifiers["country"][0]
                    # May include region: "China: Hong Kong"
                    return country.split(":")[0].strip()
        return None
    
    def _extract_host(self, record: SeqRecord) -> str:
        """Extract host from record."""
        for feature in record.features:
            if feature.type == "source":
                qualifiers = feature.qualifiers
                if "host" in qualifiers:
                    return qualifiers["host"][0].capitalize()
        return "Human"  # Default for influenza A
    
    def _normalize_date(self, date_str: str) -> str | None:
        """Normalize date string to ISO format."""
        # Common formats: "2024", "2024-06", "2024-06-15", "15-Jun-2024"
        formats = [
            "%Y-%m-%d",
            "%Y-%m",
            "%Y",
            "%d-%b-%Y",
            "%b-%Y",
        ]
        
        for fmt in formats:
            try:
                dt = datetime.strptime(date_str, fmt)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                continue
        
        return None


def fetch_h3n2_asia(
    email: str,
    api_key: str | None = None,
    min_date: str = "2020-01-01",
    max_results: int = 500,
) -> list[SequenceData]:
    """Convenience function to fetch H3N2 sequences from Asia.
    
    Args:
        email: Email for NCBI Entrez
        api_key: Optional NCBI API key
        min_date: Minimum collection date
        max_results: Maximum sequences to fetch
        
    Returns:
        List of parsed sequence data
    """
    fetcher = NCBIFetcher(email=email, api_key=api_key)
    
    query = fetcher.build_search_query(
        subtype="H3N2",
        segment="HA",
        region="Asia",
        min_date=min_date,
    )
    
    ids = fetcher.search(query, max_results=max_results)
    
    sequences = []
    for record in fetcher.fetch_records(ids):
        parsed = fetcher.parse_record(record)
        sequences.append(parsed)
    
    return sequences
```

**Step 4: Run tests to verify they pass**

```bash
cd pipeline
pytest tests/test_ncbi.py -v
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
cd ..
git add pipeline/
git commit -m "feat: implement NCBI data fetcher with BioPython"
```

---

## Task 7: Create GitHub Actions Workflow (Data Pipeline)

**Files:**
- Create: `.github/workflows/data-pipeline.yml`

**Step 1: Create the workflow file**

Create `.github/workflows/data-pipeline.yml`:

```yaml
name: Data Pipeline

on:
  schedule:
    # Run daily at 00:00 UTC
    - cron: '0 0 * * *'
  workflow_dispatch:
    inputs:
      max_sequences:
        description: 'Maximum sequences to fetch'
        required: false
        default: '100'

env:
  PYTHON_VERSION: '3.11'

jobs:
  ingest-data:
    name: Fetch and Process Sequences
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          cache: 'pip'
          cache-dependency-path: 'pipeline/pyproject.toml'
      
      - name: Install dependencies
        working-directory: pipeline
        run: |
          python -m pip install --upgrade pip
          pip install -e .
      
      - name: Run data ingestion
        working-directory: pipeline
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          NCBI_EMAIL: ${{ secrets.NCBI_EMAIL }}
          NCBI_API_KEY: ${{ secrets.NCBI_API_KEY }}
        run: |
          python -c "
          from flusight.ingestion.ncbi import fetch_h3n2_asia
          from flusight.utils.database import get_client
          import os
          
          # Fetch sequences
          max_seq = int('${{ github.event.inputs.max_sequences }}' or '100')
          print(f'Fetching up to {max_seq} sequences...')
          
          sequences = fetch_h3n2_asia(
              email=os.environ['NCBI_EMAIL'],
              api_key=os.environ.get('NCBI_API_KEY'),
              min_date='2024-01-01',
              max_results=max_seq,
          )
          
          print(f'Fetched {len(sequences)} sequences')
          
          # TODO: Push to Supabase (implement in next phase)
          for seq in sequences[:5]:
              print(f\"  - {seq['strain_name']}\")
          "
      
      - name: Report status
        if: always()
        run: |
          echo "Pipeline completed with status: ${{ job.status }}"
```

**Step 2: Commit**

```bash
git add .github/
git commit -m "feat: add GitHub Actions workflow for daily data pipeline"
```

---

## Phase 1 Complete! 🎉

**Summary of what was built:**

| Component | Status |
|-----------|--------|
| Project repository | ✅ Initialized |
| Supabase schema | ✅ Migrations ready |
| Vite + React frontend | ✅ Dashboard shell working |
| Python pipeline | ✅ Environment set up |
| NCBI data fetcher | ✅ Implemented with tests |
| GitHub Actions | ✅ Workflow ready |

---

## Next Steps

Continue with **Phase 2: Data Pipeline** which includes:
- Complete data validation pipeline
- Mutation detection engine
- Quality scoring system
- Sequence explorer UI with real data

Would you like me to create the Phase 2 implementation plan?
