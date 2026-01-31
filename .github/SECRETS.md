# GitHub Secrets Configuration

This document describes the secrets required for the FluSight-Asia GitHub Actions workflows.

## Required Secrets

Navigate to **Settings → Secrets and variables → Actions** in your GitHub repository to configure these:

### Supabase Credentials

| Secret Name | Description | Where to Find |
|-------------|-------------|---------------|
| `SUPABASE_URL` | Project API URL | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_KEY` | Service role key (NOT anon key) | Supabase Dashboard → Settings → API → service_role |

**⚠️ Important:** Use the `service_role` key, not the `anon` key. The service role key bypasses RLS and is required for pipeline write operations.

### NCBI Credentials

| Secret Name | Description | Where to Find |
|-------------|-------------|---------------|
| `NCBI_EMAIL` | Your email for NCBI Entrez | Required by NCBI policy |
| `NCBI_API_KEY` | NCBI API key (optional but recommended) | [NCBI Account Settings](https://www.ncbi.nlm.nih.gov/account/settings/) |

**Note:** The API key increases rate limits from 3 to 10 requests/second.

## Setting Up Secrets

1. Go to your repository on GitHub
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add each secret with its name and value

## Example Values

```
SUPABASE_URL=https://zrxwptfzzsaehtpjhvij.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJS... (your service role key)
NCBI_EMAIL=your-email@example.com
NCBI_API_KEY=your-ncbi-api-key
```

## Verifying Secrets

After setting up secrets, you can manually trigger the pipeline to verify:

1. Go to **Actions** tab
2. Select **FluSight Data Pipeline**
3. Click **Run workflow**
4. Set `dry_run: true` for initial testing
5. Check the logs for successful NCBI connection
