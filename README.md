# StrainScout MD — Data Pipeline

## Weekly Refresh (one command)
```bash
python run_all.py
```

## What it does
1. Scrapes all 100+ Maryland dispensary menus
2. Normalizes and deduplicates strain names
3. Enriches with Leafly type/effects/flavors
4. Grades each strain A/B/C by data confidence
5. Publishes fresh catalog JSON to your S3 bucket

## First time setup
See SETUP.md for environment and AWS configuration.
