# Supabase Configuration

This directory contains Supabase database migrations and configuration.

## Project Details

- **Project ID:** zrxwptfzzsaehtpjhvij
- **Region:** ap-southeast-1 (Singapore)
- **URL:** https://zrxwptfzzsaehtpjhvij.supabase.co

## Tables

| Table | Description | Rows |
|-------|-------------|------|
| `locations` | Asian countries/regions | 15 |
| `sequences` | H3N2 virus sequences | 0 |
| `mutations` | Detected mutations | 0 |
| `predictions` | ML model predictions | 0 |
| `pipeline_logs` | Data pipeline logs | 0 |

## Migrations

- `00001_initial_schema.sql` - Initial schema with all tables, indexes, RLS, and seed data

## Row Level Security

- **Public read access** for all tables (unauthenticated)
- **Full CRUD access** for service role (pipeline operations)
