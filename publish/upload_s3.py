#!/usr/bin/env python3
"""
Pipeline Step 5: Upload the production catalog to AWS S3 + invalidate CloudFront.

Reads credentials from .env file in the project root.
Uploads both full and minified catalog JSON files.

Input:  data/output/strainscout_catalog_v9.json
        data/output/strainscout_catalog_v9.min.json
Output: Files uploaded to S3 bucket, CloudFront cache invalidated
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime, timezone

try:
    import boto3
    from botocore.exceptions import ClientError, NoCredentialsError
except ImportError:
    print("ERROR: boto3 is required. Install with: pip install boto3")
    sys.exit(1)

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

BASE = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE / "data" / "output"
ENV_FILE = BASE / ".env"

CATALOG_FULL = OUTPUT_DIR / "strainscout_catalog_v9.json"
CATALOG_MIN = OUTPUT_DIR / "strainscout_catalog_v9.min.json"

# S3 key paths
S3_KEY_FULL = "catalog/strainscout_catalog_v9.json"
S3_KEY_MIN = "catalog/strainscout_catalog_v9.min.json"
S3_KEY_LATEST = "catalog/strainscout_catalog_latest.min.json"


def load_env():
    """Load environment variables from .env file."""
    if load_dotenv and ENV_FILE.exists():
        load_dotenv(ENV_FILE)
    elif ENV_FILE.exists():
        # Manual .env parsing fallback
        with open(ENV_FILE) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ.setdefault(key.strip(), val.strip())


def main():
    print("=" * 70)
    print("PIPELINE STEP 5: UPLOAD TO S3")
    print("=" * 70)

    load_env()

    bucket = os.environ.get("S3_BUCKET_NAME", "")
    region = os.environ.get("AWS_REGION", "us-east-1")
    cf_dist_id = os.environ.get("CLOUDFRONT_DISTRIBUTION_ID", "")

    if not bucket:
        print("ERROR: S3_BUCKET_NAME not set in .env")
        print("Skipping upload — catalog files are available locally at:")
        print(f"  {CATALOG_FULL}")
        print(f"  {CATALOG_MIN}")
        return False

    # Verify files exist
    for path in (CATALOG_FULL, CATALOG_MIN):
        if not path.exists():
            print(f"ERROR: {path} does not exist. Run build_catalog.py first.")
            return False

    try:
        s3 = boto3.client("s3", region_name=region)
    except NoCredentialsError:
        print("ERROR: AWS credentials not configured.")
        print("Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env")
        return False

    uploads = [
        (CATALOG_FULL, S3_KEY_FULL),
        (CATALOG_MIN, S3_KEY_MIN),
        (CATALOG_MIN, S3_KEY_LATEST),  # also upload min as "latest"
    ]

    for local_path, s3_key in uploads:
        size_kb = os.path.getsize(local_path) / 1024
        print(f"\nUploading {local_path.name} → s3://{bucket}/{s3_key} ({size_kb:.1f} KB)")
        try:
            s3.upload_file(
                str(local_path),
                bucket,
                s3_key,
                ExtraArgs={
                    "ContentType": "application/json",
                    "CacheControl": "max-age=3600",  # 1 hour browser cache
                },
            )
            print(f"  ✓ Uploaded successfully")
        except ClientError as e:
            print(f"  ✗ Upload failed: {e}")
            return False

    # Invalidate CloudFront cache if distribution ID is set
    if cf_dist_id:
        print(f"\nInvalidating CloudFront distribution {cf_dist_id}...")
        try:
            cf = boto3.client("cloudfront", region_name=region)
            cf.create_invalidation(
                DistributionId=cf_dist_id,
                InvalidationBatch={
                    "Paths": {
                        "Quantity": 3,
                        "Items": [
                            f"/{S3_KEY_FULL}",
                            f"/{S3_KEY_MIN}",
                            f"/{S3_KEY_LATEST}",
                        ],
                    },
                    "CallerReference": datetime.now(timezone.utc).isoformat(),
                },
            )
            print("  ✓ CloudFront invalidation created")
        except ClientError as e:
            print(f"  ✗ CloudFront invalidation failed: {e}")
            # Not fatal — files are still uploaded
    else:
        print("\nCLOUDFRONT_DISTRIBUTION_ID not set — skipping cache invalidation")

    print(f"\n{'=' * 70}")
    print("Upload complete!")
    print(f"{'=' * 70}")
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
