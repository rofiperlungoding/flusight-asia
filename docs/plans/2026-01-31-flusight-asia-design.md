# FluSight-Asia: H3N2 Influenza Mutation Intelligence Platform

> **Design Document**
> Created: 2026-01-31
> Status: APPROVED

---

## Executive Summary

**FluSight-Asia** is an enterprise-grade machine learning platform for predicting H3N2 influenza virus mutations in Asia. The system fetches genomic data from public databases, processes and analyzes sequences, and uses ensemble deep learning models to predict:

- Next dominant strain (3-6 months ahead)
- Antigenic drift and vaccine effectiveness
- Geographic spread patterns across Asian regions

The platform serves researchers, healthcare agencies, and academics through a real-time dashboard, REST API, and research export tools.

**Total Infrastructure Cost: $0.00** (all free tiers)

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FluSight-Asia Platform                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐ │
│   │   DATA LAYER     │    │   ML PIPELINE    │    │   FRONTEND       │ │
│   │                  │    │                  │    │                  │ │
│   │  • GISAID API    │───▶│  • Sequence      │───▶│  • Vite+React    │ │
│   │  • NCBI GenBank  │    │    Processing    │    │  • Dashboard     │ │
│   │  • WHO FluNet    │    │  • LSTM/RNN      │    │  • Visualizations│ │
│   │                  │    │  • Predictions   │    │  • Export Tools  │ │
│   └──────────────────┘    └────────┬─────────┘    └────────▲─────────┘ │
│                                    │                       │           │
│                                    ▼                       │           │
│                          ┌──────────────────┐              │           │
│                          │    SUPABASE      │──────────────┘           │
│                          │                  │                          │
│                          │  • PostgreSQL    │                          │
│                          │  • Auth          │                          │
│                          │  • Edge Functions│                          │
│                          │  • Realtime      │                          │
│                          └──────────────────┘                          │
│                                                                         │
│   ┌──────────────────────────────────────────────────────────────────┐ │
│   │  ML COMPUTE (GitHub Actions / Hugging Face Spaces - FREE)        │ │
│   │  Scheduled daily: Fetch → Process → Predict → Push to Supabase   │ │
│   └──────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **ML runs on GitHub Actions (free)** — Scheduled workflow fetches data daily, runs predictions, and pushes results to Supabase
2. **Supabase as the central hub** — Stores sequences, predictions, and user data
3. **Vite+React on Netlify** — Static build for fast loading, client-side fetches from Supabase

---

## 2. Data Pipeline (Enterprise-Grade)

### Data Sources

| Source | Data Type | Access | Update Frequency |
|--------|-----------|--------|------------------|
| **GISAID EpiFlu** | H3N2 sequences + metadata | Requires registration (free) | Daily |
| **NCBI GenBank** | Public sequences | Open API | Weekly |
| **WHO FluNet** | Surveillance data | Open | Weekly |
| **Nextstrain** | Pre-analyzed trees | Open | Daily |

### Processing Stages

```
STAGE 1: INGESTION LAYER
├── GISAID Connector
├── NCBI Connector
├── WHO Connector
└── Nextstrain Connector
         │
         ▼
STAGE 2: VALIDATION & QUALITY CONTROL
├── Schema Validation (required fields, type check)
├── Sequence Quality (length ~1700bp, ambiguity <1%)
├── Metadata Integrity (date format, geocoding)
└── Quality Score Assignment (A/B/C/D grades)
         │
         ▼
STAGE 3: PARSING & TRANSFORMATION
├── Sequence Parsing (BioPython, codon translation)
├── Sequence Alignment (MAFFT against reference)
└── Mutation Detection Engine
    ├── Position-by-position comparison
    ├── Synonymous vs Non-synonymous
    ├── Antigenic site mapping (Sites A-E)
    └── Novel mutation flagging
         │
         ▼
STAGE 4: ENRICHMENT & FEATURE ENGINEERING
├── Phylogenetic Analysis (clade assignment, lineage)
├── Antigenic Characterization (vaccine distance)
├── Epidemiological Context (geographic, temporal)
└── Feature Vector Generation (for ML input)
         │
         ▼
STAGE 5: DATA WAREHOUSE (Supabase)
├── Normalized Schema (sequences, mutations, predictions)
└── Data Versioning & Lineage (audit trail)
```

### Data Schema

```json
{
  "sequence_id": "EPI_ISL_12345678",
  "strain_name": "A/Singapore/2024-0042",
  "collection_date": "2024-06-15",
  "location": {
    "country": "Singapore",
    "region": "Asia",
    "coordinates": [1.3521, 103.8198]
  },
  "segment": "HA",
  "sequence": "ATGAAGACTATCATTGCTTTGAGC...",
  "mutations": ["K144N", "T131K", "R142G"],
  "clade": "3C.2a1b.2a.2",
  "vaccine_strain_distance": 0.034,
  "quality_score": "A"
}
```

---

## 3. Machine Learning Architecture

### Ensemble Model Strategy

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    FluSight-Asia ML Prediction Engine                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐          │
│   │  MODEL 1          │  │  MODEL 2          │  │  MODEL 3          │          │
│   │  Sequence LSTM    │  │  Temporal         │  │  Geographic       │          │
│   │                   │  │  Transformer      │  │  GNN              │          │
│   │  Mutation pattern │  │  Time-series      │  │  Spatial spread   │          │
│   │  recognition      │  │  forecasting      │  │  patterns         │          │
│   └─────────┬─────────┘  └─────────┬─────────┘  └─────────┬─────────┘          │
│             │                      │                      │                    │
│             └──────────────────────┼──────────────────────┘                    │
│                                    ▼                                           │
│                    ┌───────────────────────────┐                               │
│                    │  ENSEMBLE AGGREGATOR      │                               │
│                    │  (Weighted voting +       │                               │
│                    │   uncertainty estimation) │                               │
│                    └───────────────────────────┘                               │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Model 1: Sequence LSTM

- **Input:** Protein sequence (HA, ~550 amino acids) + mutation trajectory
- **Architecture:** ESM-2 embeddings → Bi-LSTM (2 layers, 256 units) → Attention → Output
- **Output:** Per-position mutation probability

### Model 2: Temporal Transformer

- **Input:** Time series of variant frequencies (past 2 years, weekly)
- **Architecture:** Transformer Encoder-Decoder (4 layers, 8 heads)
- **Output:** Predicted variant distribution (next 12 weeks) + confidence intervals

### Model 3: Geographic GNN

- **Input:** Graph (nodes = regions, edges = travel/proximity)
- **Architecture:** Graph Attention Network (3 layers)
- **Output:** Predicted variant arrival time per region

### Prediction Outputs

| Prediction Type | Model(s) Used | Update Frequency |
|-----------------|---------------|------------------|
| Next Dominant Strain | Temporal + LSTM | Weekly |
| Antigenic Drift Alert | Sequence LSTM | Daily |
| Geographic Spread | Geographic GNN | Weekly |
| Vaccine Effectiveness | Ensemble | Bi-weekly |

### Technology Stack (ML)

| Component | Technology |
|-----------|------------|
| Framework | PyTorch |
| Protein Embeddings | ESM-2 (Facebook AI) |
| Sequence Alignment | BioPython + MAFFT |
| Graph Neural Net | PyTorch Geometric |
| Experiment Tracking | Weights & Biases (free) |
| Model Serving | ONNX Runtime |

---

## 4. Frontend Dashboard

### Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Vite + React 18 + TypeScript |
| Routing | React Router v6 |
| Styling | Tailwind CSS |
| Charts | Recharts + D3.js |
| Maps | Leaflet / React-Leaflet |
| State | Zustand |
| Data Fetching | TanStack Query + Supabase Client |
| Auth | Supabase Auth |

### Pages

| Page | Purpose |
|------|---------|
| Dashboard | Overview, KPIs, alerts, predictions summary |
| Predictions | Detailed forecasts, confidence intervals |
| Sequences | Data explorer, mutation viewer |
| Research | Export tools, report generation |
| API Docs | Integration guide, code examples |
| Settings | User preferences, notifications |

### Design Aesthetic

- **Color Scheme:** Medical/scientific (blues, teals, clean whites)
- **Dark Mode:** Supported
- **Typography:** Inter (headings), JetBrains Mono (sequences)
- **Accessibility:** WCAG 2.1 AA compliant

---

## 5. API Design

### Endpoints (Supabase Edge Functions)

```
SEQUENCES
GET  /sequences                    List sequences (paginated)
GET  /sequences/:id                Get sequence details
GET  /sequences/:id/alignment      Get aligned sequence

PREDICTIONS
GET  /predictions/dominant         Next dominant strain
GET  /predictions/vaccine-match    Vaccine effectiveness
GET  /predictions/spread           Geographic spread
GET  /predictions/mutations        Mutation probabilities

ANALYTICS
GET  /analytics/trends             Variant frequency over time
GET  /analytics/geography          Regional distribution
GET  /analytics/mutations          Most common mutations

EXPORT
POST /export/fasta                 Export as FASTA
POST /export/csv                   Export as CSV
POST /export/report                Generate PDF report

WEBHOOKS
POST /webhooks/subscribe           Subscribe to alerts
POST /webhooks/unsubscribe         Unsubscribe
```

### Access Tiers

| Tier | Rate Limit | Features |
|------|------------|----------|
| Public (no auth) | 100/hour | Dashboard, basic predictions |
| Registered (free) | 1,000/hour | Full access, exports, API key |
| Researcher | 10,000/hour | Bulk data, webhooks, priority |

---

## 6. Infrastructure ($0 Cost)

| Service | Free Tier Limits | Our Usage |
|---------|------------------|-----------|
| GitHub Actions | 2,000 min/month | ~500 min/month |
| Supabase | 500MB DB, 2GB storage | ~200MB, ~500MB |
| Netlify | 100GB bandwidth | ~5GB |
| Hugging Face Spaces | Unlimited CPU | Model inference |
| Weights & Biases | Free personal | Experiment tracking |

---

## 7. Development Phases

### Phase 1: Foundation (Weeks 1-4)
- [ ] Set up Supabase project and schema
- [ ] Set up Vite + React project
- [ ] Implement basic data ingestion from NCBI
- [ ] Build basic dashboard UI shell

### Phase 2: Data Pipeline (Weeks 5-8)
- [ ] Complete data pipeline (all 5 stages)
- [ ] Set up GitHub Actions workflows
- [ ] Implement quality control system
- [ ] Build sequence explorer UI

### Phase 3: ML Models (Weeks 9-16)
- [ ] Implement Sequence LSTM
- [ ] Implement Temporal Transformer
- [ ] Implement Geographic GNN
- [ ] Build ensemble aggregator
- [ ] Set up Hugging Face Spaces deployment

### Phase 4: Dashboard & API (Weeks 17-20)
- [ ] Complete all dashboard pages
- [ ] Implement all API endpoints
- [ ] Add export features
- [ ] Implement authentication

### Phase 5: Polish & Launch (Weeks 21-24)
- [ ] Performance optimization
- [ ] Documentation
- [ ] Testing & bug fixes
- [ ] Production deployment

---

## Appendix: Key Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| ML Framework | PyTorch | Best for research + production |
| Frontend | Vite + React + TS | Fast, simple, Netlify-compatible |
| Database | Supabase | Free tier, built-in auth/realtime |
| ML Hosting | Hugging Face Spaces | Free CPU inference |
| CI/CD | GitHub Actions | Free 2000 min/month |
| Cost | $0 | All services on free tiers |
