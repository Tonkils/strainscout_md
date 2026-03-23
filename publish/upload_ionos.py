#!/usr/bin/env python3
"""
Pipeline Step 5: Upload the production catalog + rebuilt SPA to IONOS webspace via SFTP.

Uploads:
  1. Catalog JSON to webspace /data/ directory
  2. Optionally rebuilds and uploads the full SPA

Credentials from .env:
  IONOS_SFTP_HOST=access-5019966776.webspace-host.com
  IONOS_SFTP_PORT=22
  IONOS_SFTP_USER=a3051710
  IONOS_SFTP_PASS=...

Usage:
    python -m publish.upload_ionos                # Upload catalog only
    python -m publish.upload_ionos --full-deploy  # Rebuild SPA + upload everything
"""

import json
import os
import sys
import argparse
from pathlib import Path
from datetime import datetime, timezone

try:
    import paramiko
except ImportError:
    print("ERROR: paramiko is required. Install with: pip install paramiko")
    sys.exit(1)

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

BASE = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE / "data" / "output"
WEB_DIST = BASE / "web" / "dist"
ENV_FILE = BASE / ".env"

# Default IONOS credentials (override via .env)
DEFAULT_HOST = "access-5019966776.webspace-host.com"
DEFAULT_PORT = 22
DEFAULT_USER = "a3051710"


def load_env():
    """Load environment variables from .env file."""
    if load_dotenv and ENV_FILE.exists():
        load_dotenv(ENV_FILE)


def get_sftp_creds():
    """Get SFTP connection credentials."""
    return {
        "host": os.getenv("IONOS_SFTP_HOST", DEFAULT_HOST),
        "port": int(os.getenv("IONOS_SFTP_PORT", DEFAULT_PORT)),
        "user": os.getenv("IONOS_SFTP_USER", DEFAULT_USER),
        "password": os.getenv("IONOS_SFTP_PASS", ""),
    }


def connect_sftp(creds: dict):
    """Establish SFTP connection."""
    transport = paramiko.Transport((creds["host"], creds["port"]))
    transport.connect(username=creds["user"], password=creds["password"])
    sftp = paramiko.SFTPClient.from_transport(transport)
    return sftp, transport


def upload_recursive(sftp, local_path: Path, remote_path: str) -> int:
    """Recursively upload a directory via SFTP. Returns file count."""
    uploaded = 0
    for item in sorted(local_path.iterdir()):
        remote_item = remote_path + "/" + item.name
        if item.is_dir():
            try:
                sftp.mkdir(remote_item)
            except IOError:
                pass  # directory exists
            uploaded += upload_recursive(sftp, item, remote_item)
        else:
            sftp.put(str(item), remote_item)
            size = item.stat().st_size
            print(f"    PUT: {remote_item} ({size:,} bytes)")
            uploaded += 1
    return uploaded


def upload_catalog_only(sftp):
    """Upload just the catalog JSON files to /data/."""
    # Find the latest catalog (sort by version number, not alphabetically)
    import re as _re
    catalogs = list(OUTPUT_DIR.glob("strainscout_catalog_v*.min.json"))
    if not catalogs:
        print("ERROR: No catalog JSON found in", OUTPUT_DIR)
        return False

    def version_key(p):
        m = _re.search(r'_v(\d+)', p.name)
        return int(m.group(1)) if m else 0

    catalogs.sort(key=version_key)
    latest = catalogs[-1]
    version = latest.stem.replace("strainscout_catalog_", "").replace(".min", "")
    print(f"  Uploading catalog {version}: {latest.name} ({latest.stat().st_size:,} bytes)")

    # Ensure /data/ directory exists
    try:
        sftp.mkdir("./data")
    except IOError:
        pass

    # Upload minified catalog
    sftp.put(str(latest), f"./data/{latest.name}")
    print(f"    PUT: /data/{latest.name}")

    # Also upload as the "current" catalog (so the app always loads the latest)
    sftp.put(str(latest), f"./data/strainscout_catalog_v10.min.json")
    print(f"    PUT: /data/strainscout_catalog_v10.min.json (symlink)")

    # Upload full (non-minified) version if it exists
    full_path = latest.with_name(latest.name.replace(".min", ""))
    if full_path.exists():
        sftp.put(str(full_path), f"./data/{full_path.name}")
        print(f"    PUT: /data/{full_path.name}")

    return True


def full_deploy(sftp):
    """Upload entire SPA dist/ directory."""
    if not WEB_DIST.exists():
        print("ERROR: web/dist/ not found. Run 'vite build' first.")
        return False

    print(f"  Full deploy from: {WEB_DIST}")
    count = upload_recursive(sftp, WEB_DIST, ".")
    print(f"  Uploaded {count} files")

    # Upload .htaccess for SPA routing
    htaccess_content = """# StrainScout MD — SPA Routing
RewriteEngine On
RewriteBase /

# Force HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# If file or directory exists, serve it directly
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d

# Otherwise, serve index.html (SPA client-side routing)
RewriteRule ^(.*)$ /index.html [L]

# Enable gzip compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json
</IfModule>

# Cache static assets for 1 year
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType application/json "access plus 1 day"
</IfModule>
"""
    with sftp.open("./.htaccess", "w") as f:
        f.write(htaccess_content)
    print("    PUT: .htaccess (SPA routing)")

    return True


def main(full_deploy_override=None):
    parser = argparse.ArgumentParser(description="Upload to IONOS webspace")
    parser.add_argument("--full-deploy", action="store_true",
                        help="Upload entire SPA, not just catalog")
    args, _ = parser.parse_known_args()

    if full_deploy_override is not None:
        args.full_deploy = full_deploy_override

    print("=" * 70)
    print("PIPELINE STEP 5: UPLOAD TO IONOS")
    print("=" * 70)

    load_env()
    creds = get_sftp_creds()

    if not creds["password"]:
        print("ERROR: IONOS_SFTP_PASS not set in .env")
        print("Add this to your .env file:")
        print(f"  IONOS_SFTP_HOST={creds['host']}")
        print(f"  IONOS_SFTP_USER={creds['user']}")
        print("  IONOS_SFTP_PASS=your_password_here")
        sys.exit(1)

    print(f"Connecting to {creds['host']}:{creds['port']} as {creds['user']}...")

    try:
        sftp, transport = connect_sftp(creds)
    except Exception as e:
        print(f"ERROR: SFTP connection failed: {e}")
        sys.exit(1)

    print("Connected!")

    try:
        if args.full_deploy:
            success = full_deploy(sftp)
        else:
            success = upload_catalog_only(sftp)
    finally:
        sftp.close()
        transport.close()

    if success:
        print(f"\n✓ Upload completed at {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    else:
        print("\n✗ Upload failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
