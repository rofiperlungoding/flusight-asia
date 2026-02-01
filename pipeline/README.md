# FluSight-Asia Pipeline

Data ingestion and ML pipeline for influenza surveillance in Asia.

## Overview

This pipeline:
1. **Ingests** H3N2 HA sequences from NCBI GenBank
2. **Detects** mutations by comparing to reference strains
3. **Trains** ML models (LSTM, Transformer, GNN) for prediction
4. **Forecasts** antigenic drift risk and variant trajectories

## Structure

```
pipeline/
├── src/flusight/         # Core package
│   ├── ingestion/        # NCBI data fetching
│   ├── processing/       # Mutation detection, timeseries
│   ├── ml/               # Models, tokenizers, data loaders
│   └── storage/          # Database utilities
├── scripts/              # Training and prediction scripts
├── models/               # Saved model weights
└── tests/                # Unit tests
```

## Usage

### Local Development

```bash
# Install in editable mode
pip install -e .

# Run training
python scripts/train_transformer.py
python scripts/train_lstm.py
python scripts/train_gnn.py

# Run predictions
python scripts/predict.py
python scripts/predict_temporal.py
python scripts/predict_spread.py
```

### GitHub Actions

The pipeline runs automatically every 3 hours via GitHub Actions, or can be triggered manually.

## Environment Variables

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `NCBI_EMAIL` - Email for NCBI API
- `NCBI_API_KEY` - NCBI API key (optional, increases rate limit)

## License

MIT
