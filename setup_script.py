
import os

folders = [
    "scraper",
    "pipeline",
    "data/raw",
    "data/processed",
    "data/output",
    "logs",
]

files = {
    "scraper/__init__.py": "",
    "pipeline/__init__.py": "",

    ".env": (
        "# Fill these in after setting up AWS\n"
        "AWS_ACCESS_KEY_ID=\n"
        "AWS_SECRET_ACCESS_KEY=\n"
        "AWS_REGION=us-east-1\n"
        "S3_BUCKET_NAME=\n"
        "CLOUDFRONT_DISTRIBUTION_ID=\n"
    ),

    ".gitignore": (
        "# Never commit credentials or raw data to GitHub\n"
        ".env\n"
        "data/raw/\n"
        "data/processed/\n"
        "__pycache__/\n"
        "*.pyc\n"
        "logs/\n"
        ".playwright/\n"
    ),

    "README.md": (
        "# StrainScout MD — Data Pipeline\n\n"
        "## Weekly Refresh (one command)\n"
        "```bash\n"
        "python run_all.py\n"
        "```\n\n"
        "## What it does\n"
        "1. Scrapes all 100+ Maryland dispensary menus\n"
        "2. Normalizes and deduplicates strain names\n"
        "3. Enriches with Leafly type/effects/flavors\n"
        "4. Grades each strain A/B/C by data confidence\n"
        "5. Publishes fresh catalog JSON to your S3 bucket\n\n"
        "## First time setup\n"
        "See SETUP.md for environment and AWS configuration.\n"
    ),

    "SETUP.md": (
        "# First Time Setup\n\n"
        "## 1. Install dependencies\n"
        "```bash\n"
        "pip install requests playwright beautifulsoup4 lxml boto3 python-dotenv tqdm\n"
        "playwright install chromium\n"
        "```\n\n"
        "## 2. Configure environment\n"
        "Edit `.env` with your AWS credentials and S3 bucket name.\n\n"
        "## 3. Run\n"
        "```bash\n"
        "python run_all.py\n"
        "```\n"
    ),

    "data/dispensaries.json": "[]",
}

print("Creating StrainScout MD data pipeline structure...\n")

for folder in folders:
    os.makedirs(folder, exist_ok=True)
    print(f"  Created folder: {folder}/")

for filepath, content in files.items():
    if not os.path.exists(filepath):
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  Created file:   {filepath}")
    else:
        print(f"  Skipped (exists): {filepath}")

print("\nDone. Your project structure is ready.")
print("Project path: C:\\Users\\jaretwyatt\\.local\\bin\\strainscoutmd\\strainscout_md")
print("Next: share the Manus scripts and we'll start building the scraper.")
