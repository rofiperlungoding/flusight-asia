# FluSight-Asia

H3N2 Influenza Mutation Intelligence Platform for Asia.

## Overview

Enterprise-grade ML platform for predicting H3N2 influenza virus mutations. Serves researchers, healthcare agencies, and academics through real-time dashboard, REST API, and research export tools.

## Key Features

- 🔮 **Mutation Prediction** — ML models forecast which variants will dominate
- 🗺️ **Geographic Tracking** — Monitor spread patterns across Asian regions
- 💉 **Vaccine Insights** — Assess vaccine effectiveness against emerging strains
- 📊 **Real-time Dashboard** — Interactive visualizations and alerts
- 🔌 **REST API** — Integrate predictions into healthcare systems

## Tech Stack

- **Frontend:** Vite + React 18 + TypeScript + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **ML Pipeline:** Python + PyTorch + BioPython
- **Hosting:** Netlify (frontend) + Hugging Face Spaces (ML)
- **CI/CD:** GitHub Actions

## Project Structure

```
flusight-asia/
├── frontend/          # Vite + React dashboard
├── pipeline/          # Python data & ML pipeline
├── supabase/          # Database migrations & edge functions
├── .github/           # GitHub Actions workflows
└── docs/              # Documentation
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- Supabase account (free tier)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/flusight-asia.git
cd flusight-asia

# Install frontend dependencies
cd frontend
npm install

# Set up Python environment
cd ../pipeline
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -e ".[dev]"
```

### Environment Variables

Create `.env` files in `frontend/` and `pipeline/` directories based on `.env.example` templates.

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## Contact

Built with ❤️ for the healthcare community.
