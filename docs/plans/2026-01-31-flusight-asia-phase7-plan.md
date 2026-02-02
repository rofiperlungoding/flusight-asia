# Phase 7: Temporal Transformer & Competitive Variant Modelling

> **Status:** PLANNING
> **Target:** Implement time-series forecasting to predict the future dominance of H3N2 subclades.
> **Deliverable:** A trained Transformer model and a live "Variant Projection" chart on the dashboard.

---

## 1. Executive Summary

While Phase 6 provided a static "Risk Score" based on individual mutations, **Phase 7** introduces the temporal dimension. Influenza evolution is a competitive process where distinct subclades compete for dominance in the host population.

We will build a **Multivariate Time-Series Transformer** that models this competition. Instead of predicting a single number, we predict the **probability distribution** of all major variants over the next 12 weeks.

**Key Question Answered:** *"Which H3N2 variant will be the dominant strain in Asia 3 months from now?"*

---

## 2. Scientific & Technical Architecture

### 2.1 The Data Transformation Pipeline
We must transform raw biological sequences into a structured time-series dataset suitable for deep learning.

```
┌─────────────────┐       ┌───────────────────────────────┐       ┌───────────────────────────┐
│  Raw Sequences  │       │   Data Engineering (Task 7.1) │       │   Model Input Tensor      │
│  (Supabase DB)  │──────▶│  • Aggregation (Weekly)       │──────▶│  Shape: (Batch, 52, K)    │
│                 │       │  • Variant Clustering (Top-K) │       │  • 52 Weeks History       │
│  • A/Bangkok... │       │  • Normalization (Sum=1.0)    │       │  • K Variant Proportions  │
│  • A/Tokyo...   │       │  • Smoothing (Rolling Avg)    │       │                           │
└─────────────────┘       └───────────────────────────────┘       └─────────────┬─────────────┘
                                                                                │
                                                                                ▼
┌─────────────────┐       ┌───────────────────────────────┐       ┌───────────────────────────┐
│  Dashboard UI   │       │   Inference Engine (Task 7.3) │       │   Temporal Transformer    │
│  (React/Vite)   │◀──────│  • Autoregressive Prediction  │◀──────│       (Task 7.2)          │
│                 │       │  • Forecast Storage (DB)      │       │  • Encoder-Decoder Arch   │
│  [Stacked Chart]│       │  • Confidence Intervals       │       │  • Minimize KL-Divergence │
└─────────────────┘       └───────────────────────────────┘       └───────────────────────────┘
```

### 2.2 Model Architecture: The "FluTransformer"
We will implement a custom Transformer rather than using off-the-shelf ARIMA or RNNs, as Transformers handle long-term dependencies (seasonality) better.

*   **Input Embedding:** Linear projection of the $K$-dimensional variant vector to model dimension $d_{model}$.
*   **Positional Encoding:** Sinusoidal encoding to preserve the notion of "time" (weeks).
*   **Encoder:** 2 layers of Multi-Head Self-Attention to understand historical context.
*   **Decoder:** Autoregressive decoder to generate the future trajectory step-by-step.
*   **Output Layer:** Softmax activation to ensure predictions sum to 1.0 (valid probability distribution).

**Loss Function:**
We will use **KL-Divergence Loss** ($\sum P(x) \log \frac{P(x)}{Q(x)}$) instead of MSE. This is strictly better for comparing probability distributions (the "shape" of the variant population).

---

## 3. Detailed Implementation Plan

### Task 7.1: Advanced Time-Series Data Engineering
**Objective:** Convert raw sequence rows into a clean, normalized weekly time-series matrix.

| Step | Subtask | Detailed Description | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **7.1.1** | **Variant Definition Logic** | Create a robust strategy to define "Variants". Since "Clade" data might be missing, we will use **Top-5 Mutation Signatures**. Identify the 5 most common sets of mutations in the last year. | Function `identify_top_variants(sequences)` returns top 5 signatures + "Other". |
| **7.1.2** | **Signal Processing (Aggregation)** | Create `TimeseriesProcessor.aggregate()`: Group sequences by ISO Week. Count occurrences of each variant. Handle empty weeks with forward-filling (or zero-filling if appropriate). | DataFrame with Index=Week, Cols=Variant_A...Variant_E, Other. |
| **7.1.3** | **Normalization & Smoothing** | Apply a 3-week rolling average to smooth out noise from low sampling rates. Normalize each row so row sum = 1.0. | No `NaN` values. All rows sum to approx 1.0. |
| **7.1.4** | **Tensor Generation** | Create `SlidingWindowDataset` class for PyTorch. Input: (t-52 to t). Target: (t+1 to t+12). | Returns valid PyTorch/Numpy tensors. |

### Task 7.2: Transformer Model Construction
**Objective:** Build and train the PyTorch model.

| Step | Subtask | Detailed Description | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **7.2.1** | **Model Skeleton** | Implement `FluSightTransformer` in `models.py`. distinct `Encoder` and `Decoder` blocks. Configurable `d_model` (e.g., 64), `nhead` (4). | `model(input).shape` matches `(batch, pred_len, num_variants)`. |
| **7.2.2** | **Positional Encodings** | Implement the standard "Attention Is All You Need" sine/cosine positional encoding class. | Visual check: patterns vary by position. |
| **7.2.3** | **Training Loop** | Create `train_transformer.py`. Implement the training loop with `KLDivLoss`. Use `AdamW` optimizer. Include validation split (last 12 weeks of data). | Training loss converges. Validation loss < 0.1. |
| **7.2.4** | **Model Serialization** | Save the best model state dict to `pipeline/models/transformer_v1.pth` and the "Variant Map" (definition of the classes) to JSON. | Artifacts exist and can be reloaded. |

### Task 7.3: Production Inference Pipeline
**Objective:** Automate the prediction in the GitHub Actions workflow.

| Step | Subtask | Detailed Description | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **7.3.1** | **Database Schema** | Create `variant_forecasts` table in Supabase. Cols: `id`, `forecast_date`, `week_date`, `variant_distribution` (JSONB). | Migration applies successfully. |
| **7.3.2** | **Inference Script** | Create `predict_trends.py`: Load model -> Fetch latest data -> Predict next 12 weeks -> Write to DB. | Script runs end-to-end without error. DB populated. |
| **7.3.3** | **CI/CD Integration** | Update `.github/workflows/pipeline.yml` to include the `predict_trends` step. Install necessary dependencies (torch). | CI job passes. |

### Task 7.4: Frontend "Variant Projection" UI
**Objective:** Visualize the competitive landscape.

| Step | Subtask | Detailed Description | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **7.4.1** | **Data Hook** | Create `useVariantForecasts(region)` hook. Fetch and sort data by week. | Returns typed data ready for charts. |
| **7.4.2** | **Stacked Area Chart** | Create `VariantForecastChart.tsx` using `Recharts`. Use distinct colors for each variant. Add a vertical line separating "History" vs "Forecast". | Chart renders. Tooltips show percentages. |
| **7.4.3** | **Insight Summary** | Add a text component: "Dominant Strain: X (expected to rise to Y% by [Date])". | Insight is readable and accurate. |

---

## 4. Risk Mitigation

*   **Data Sparsity:**
    *   *Risk:* Some weeks may have 0 sequences.
    *   *Mitigation:* Use rigorous smoothing (3-week rolling avg) and potentially "up-weighting" sparse data. If a week is empty, forward-fill interactions from previous week with decay.
*   **Model Instability:**
    *   *Risk:* Transformers on small data can be unstable.
    *   *Mitigation:* Use very small dimensions (`d_model=64`), high dropout (0.2), and weight decay. Fallback to simple linear extrapolation if model variance is too high.
*   **Variant Drift:**
    *   *Risk:* New variants appear that the model hasn't seen (the "Other" category grows).
    *   *Mitigation:* Re-train the model every week in the CI pipeline (Online Learning).

---

## 5. Execution Sequence

1.  **Initialize DB:** Run Migration 7.3.1.
2.  **Code Data Processor:** Implement `TimeseriesProcessor` (Task 7.1).
3.  **Code & Train Model:** Implement & Train `FluSightTransformer` (Task 7.2).
4.  **Integrate Pipeline:** Connect script to GitHub Actions (Task 7.3).
5.  **Build UI:** Create Chart & Deploy (Task 7.4).
