# Phase 6: Predictive Analytics & Reporting Implementation Plan

**Goal:** Transform FluSight-Asia into a predictive intelligence platform by integrating LSTM-based mutation forecasting and automated situation reporting.

**Architecture:**
1.  **Predictive Engine:** A Python-based inference pipeline (`predict.py`) that loads the trained PyTorch LSTM model (`best_model.pth`). It generates probability-based forecasts for the next 3 months of viral evolution, calculating "Risk Scores" (0.0-1.0) based on the antigenic distance of predicted mutations.
2.  **Data Persistence:** A new `forecasts` table in Supabase to store these predictions, linked to specific regions and months.
3.  **Visualization Layer:** A dedicated `ForecastChart` component in the React frontend using `recharts` to render historical risk vs. predicted risk with confidence intervals.
4.  **Reporting Engine:** A client-side PDF generation utility (`jspdf`) that captures the current dashboard state (charts, maps, stats) and compiles a professional "Situation Report" for stakeholders.

**Tech Stack:**
-   **ML/Backend:** Python 3.11, PyTorch, Supabase Python Client
-   **Frontend:** React 19, Recharts, TanStack Query, Tailwind CSS (Visuals), Lucide React (Icons)
-   **Reporting:** jsPDF, jspdf-autotable
-   **Database:** PostgreSQL (Supabase)

---

## User Review Required
> [!IMPORTANT]
> **Model Availability:** Ensure `best_model.pth` is available in the `pipeline/` directory. If the model is not trained, run `train_lstm.py` first.
> **Database Migration:** This plan involves a database schema change. Ensure you have permissions to run migrations.

---

## Bite-Sized Task Granularity

| Action | Step |
|--------|------|
| **Task 6.1: Database & Pipeline** | |
| Create SQL Migration for Forecasts | Step 1 |
| Apply Migration to Supabase | Step 2 |
| Create `predict.py` Skeleton | Step 3 |
| Implement Prediction Logic & Write to DB | Step 4 |
| Add `predict-trends` Job to GitHub Actions | Step 5 |
| **Task 6.2: Frontend Forecast UI** | |
| Create `useForecasts` Hook | Step 6 |
| Create `ForecastChart` Component | Step 7 |
| Integrate Chart into Dashboard | Step 8 |
| **Task 6.3: Reporting Engine** | |
| Install PDF Dependencies | Step 9 |
| Create `ReportGenerator` Utility | Step 10 |
| Add "Generate Report" Action to Dashboard | Step 11 |

---

## Task Template

### Task 6.1: ML Forecasting Pipeline Setup

**Files:**
-   Create: `supabase/migrations/20260131_create_forecasts.sql`
-   Create: `pipeline/scripts/predict.py`
-   Modify: `.github/workflows/pipeline.yml`

**Step 1: Create SQL Migration for Forecasts**

Define the schema for storing predictions.

*   **File:** `supabase/migrations/20260131_create_forecasts.sql`
*   **Content:**
    ```sql
    CREATE TABLE IF NOT EXISTS forecasts (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        region TEXT NOT NULL DEFAULT 'Asia',
        forecast_date DATE NOT NULL, -- The future month being predicted (e.g., 2026-02-01)
        risk_score FLOAT NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
        predicted_variants JSONB, -- Array of probable amino acids/mutations
        confidence_lower FLOAT,
        confidence_upper FLOAT,
        model_version TEXT DEFAULT 'v1.0'
    );

    -- Enable RLS
    ALTER TABLE forecasts ENABLE ROW LEVEL SECURITY;

    -- Policy: Public Read
    CREATE POLICY "Public can read forecasts" ON forecasts FOR SELECT USING (true);

    -- Policy: Service Role Write
    CREATE POLICY "Service role can insert forecasts" ON forecasts FOR INSERT WITH CHECK (true);
    ```

**Step 2: Apply Migration**

*   **Command:** Run the SQL against the Supabase instance using the MCP tool or CLI.
*   **Verification:** Check if table `forecasts` exists in the dashboard/schema.

**Step 3: Create `predict.py` Script**

Implement the inference logic using the trained LSTM.

*   **File:** `pipeline/scripts/predict.py`
*   **Key Logic:**
    1.  Initialize Supabase client (using env vars).
    2.  Load `best_model.pth` and `SequenceTokenizer`.
    3.  Fetch the latest `H3N2` sequence from `sequences` table as the "seed".
    4.  Run inference loop for 3 "steps" (months), generating probability distributions for mutations.
    5.  Calculate `risk_score`:
        *   Base score: 0.2
        *   Add 0.1 for every predicted mutation that is NOT in the reference strain.
        *   Cap at 1.0.
    6.  Insert rows into `forecasts` table.

**Step 4: Add `predict-trends` Job to GitHub Actions**

Integrate into the automation pipeline.

*   **File:** `.github/workflows/pipeline.yml`
*   **Change:** Add a new job `predict-trends` that `needs: ingest-sequences`.
*   **Snippet:**
    ```yaml
    predict-trends:
      needs: ingest-sequences
      runs-on: ubuntu-latest
      defaults:
        run:
           working-directory: pipeline
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-python@v5
          with:
            python-version: '3.11'
        - run: pip install torch numpy pandas httpx
        - run: python scripts/predict.py
          env:
             SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
             SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
    ```

---

### Task 6.2: Forecast Visualization (Frontend)

**Files:**
-   Create: `frontend/src/hooks/useForecasts.ts`
-   Create: `frontend/src/components/Charts/ForecastChart.tsx`
-   Modify: `frontend/src/pages/Dashboard.tsx`

**Step 6: Create `useForecasts` Hook**

Fetch forecast data from Supabase.

*   **File:** `frontend/src/hooks/useForecasts.ts`
*   **Logic:**
    *   `useQuery(['forecasts'])`
    *   `supabase.from('forecasts').select('*').order('forecast_date', { ascending: true })`
    *   Return typed data array.

**Step 7: Create `ForecastChart` Component**

Visualize the risk trajectory.

*   **File:** `frontend/src/components/Charts/ForecastChart.tsx`
*   **UI Components:** `Recharts` (AreaChart/LineChart).
*   **Visual Style:**
    *   **X-Axis:** Month (MMM YY).
    *   **Y-Axis:** Risk Score (0-1).
    *   **Historical Data:** Solid purple line (`#8b5cf6`).
    *   **Forecast Data:** Dashed rose line (`#e11d48`) starting from today.
    *   **Confidence Interval:** Transparent area around the dashed line.
    *   **Tooltip:** Custom tooltip showing "Predicted Risk: High/Medium/Low".

**Step 8: Integrate into Dashboard**

*   **File:** `frontend/src/pages/Dashboard.tsx`
*   **Placement:** Below the "Temporal Trends" chart.
*   **Header:** "Predictive Risk Analysis (Next 3 Months)".

---

### Task 6.3: PDF Reporting Engine

**Files:**
-   Create: `frontend/src/utils/ReportGenerator.ts`
-   Modify: `frontend/src/pages/Dashboard.tsx`

**Step 9: Install Dependencies**

*   **Command:** `npm install jspdf jspdf-autotable`

**Step 10: Create `ReportGenerator` Utility**

Implement the PDF generation logic.

*   **File:** `frontend/src/utils/ReportGenerator.ts`
*   **Class:** `SituationReportGenerator`
*   **Methods:**
    *   `generate(data: DashboardData)`: Main entry point.
    *   `addHeader()`: Adds logo, title "FluSight-Asia Situation Report", and date.
    *   `addSummary(stats)`: Adds a table of key metrics (Total Sequences, Risk Level, Dominant Strain).
    *   `addForecastSection(forecasts)`: Adds a text summary of the outlook.
    *   `save()`: Triggers browser download.

**Step 11: Add Action to Dashboard**

*   **File:** `frontend/src/pages/Dashboard.tsx`
*   **Action:** Modify the "Download Report" button.
*   **Logic:**
    *   Gather current state (stats, forecasts, logs).
    *   Call `SituationReportGenerator.generate(data)`.

---

## Execution Handoff

> **"Plan complete and saved to `docs/plans/2026-01-31-flusight-asia-phase6-plan.md`.**
>
> **How would you like to proceed?**
> 1.  **Execute Task 6.1** — Set up the DB & ML Pipeline.
> 2.  **Review Plan** — Discuss any architectural changes.
