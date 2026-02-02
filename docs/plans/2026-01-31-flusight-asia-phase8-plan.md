# Phase 8: Geographic Spread Forecasting (GNN)

> **Status:** COMPLETED
> **Target:** Implement a Graph Neural Network (GNN) to predict the spatial spread of H3N2 variants across Asian regions.
> **Deliverable:** A trained GNN model and an interactive "Spread Simulation" map on the dashboard.

---

## 1. Executive Summary

Viruses don't just evolve; they travel. **Phase 8** adds the **Spatial Dimension** to our platform. By modeling Asian countries as a connected graph network, we can predict how a dominant variant in *Bangkok* might influence the viral landscape in *Tokyo* 2 weeks later.

We will use a **Graph Neural Network (GNN)**, specifically a Graph Attention Network (GAT) or Spatiotemporal GCN, to capture the complex dependencies between geographic regions.

**Key Question Answered:** *"If a new escape variant appears in Vietnam today, when will it likely reach Japan and South Korea?"*

---

## 2. Scientific & Technical Architecture

### 2.1 The Viral Flow Graph
We define a static graph $G = (V, E)$ where:
*   **Nodes ($V$):** Major regions/countries (e.g., Thailand, Vietnam, Singapore, Japan, South Korea, India, China, Indonesia).
*   **Edges ($E$):** Connectivity weights representing transmission potential (based on flight volume proximities or shared land borders).

```
    [China] <───> [Japan]
       │            ^
       │            │
       v            v
    [Vietnam] <─> [Thailand] <──> [Singapore] <──> [Indonesia]
```

### 2.2 Model Architecture: GNN-LSTM (Spatiotemporal)
Pure GNNs handle space. Pure LSTMs handle time. We combine them.

*   **Input Tensor:** $(Batch, Time, Nodes, Features)$
    *   *Features:* Variant prevalence vector per country per week.
*   **Graph Convolution:** Aggregates information from neighbor nodes (e.g., "Singapore's future risk depends on Thailand's current prevalence").
*   **Temporal Update:** Updates the state of each node based on its own history and the aggregated neighbor info.
*   **Output:** Predicted prevalence for each node for the next step.

---

## 3. Detailed Implementation Plan

### Task 8.1: Geographic Data Engineering
**Objective:** Construct the graph structure and process sequence data into node-level time series.

| Step | Subtask | Detailed Description | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **8.1.1** | **Graph Topology Definition** | Define the adjacency matrix for key Asian hubs. hardcode weights based on general proximity/travel tiers (e.g., High connection = 1.0, Med = 0.5). | JSON/Dict defining `nodes` and `edges`. |
| **8.1.2** | **Spatial Aggregation** | Extend `TimeseriesProcessor` to `GeoTimeseriesProcessor`. Group sequences by `(Country, Week)`. Normalize per country. | DataFrame with MultiIndex `(Week, Country)`. |
| **8.1.3** | **Graph Tensor Construction** | Create `GraphDataset` that emits PyTorch Geometric `Data` objects or suitable tensors for the combined model. | Valid $(B, T, N, F)$ tensors. |

### Task 8.2: GNN Model Implementation
**Objective:** Build the Spatiotemporal GNN.

| Step | Subtask | Detailed Description | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **8.2.1** | **Setup Dependencies** | Install `torch_geometric` (if environment permits) or implement a simple message-passing layer in pure PyTorch (safer for broad compatibility). **Decision:** Implement simplified `GraphConvLayer` in pure PyTorch to avoid heavy dependencies. | `GraphConv` class works with standard tensors. |
| **8.2.2** | **SpatioTemporalModel** | Architecture: `GCN_Layer` -> `LSTM_Layer` -> `GCN_Layer` -> `Output`. | Model forward pass works. |
| **8.2.3** | **Training Loop** | Train on historical spread patterns. Loss: MSE across all nodes/time steps. | Validation loss decreases. |

### Task 8.3: Inference & Simulation Pipeline
**Objective:** Run the simulation for the future.

| Step | Subtask | Detailed Description | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **8.3.1** | **Inference Script** | Create `predict_spread.py`. Load latest state for all countries. Auto-regressively predict region states for next 12 weeks. | Predictions generated. |
| **8.3.2** | **Database Storage** | Create `geo_forecasts` table. Store predictions by `country` and `date`. | Data accessible in Supabase. |

### Task 8.4: "Spread Map" Visualization
**Objective:** Visualize the flow of variants.

| Step | Subtask | Detailed Description | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **8.4.1** | **Map Data Hook** | `useGeoForecasts`. Fetch predictions for all regions. | Returns typed data. |
| **8.4.2** | **Interactive Map** | Update `ClusterMap` or create `SpreadMap`. Use colored circles (Red=Rising Risk) on centroids. Add a "Time Slider" to play the forecast animation. | Slider changes map state. Tooltips show future variant mix. |

---

## 4. Execution Sequence

1.  **Define Graph:** Create the adjacency list of countries.
2.  **Process Data:** specialized aggregation by country.
3.  **Build Model:** Pure PyTorch Graph Convolution + LSTM.
4.  **Train & Predict:** Run the pipeline.
5.  **Visualize:** Build the time-traveling map.
