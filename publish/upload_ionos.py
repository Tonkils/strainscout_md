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
    python -m publish.upload_ionos --full-deploy  # Rebuild Vite SPA (web/) + upload everything
    python -m publish.upload_ionos --next-deploy        # Deploy Next.js static export (web_2/out/) + upload everything
    python -m publish.upload_ionos --next-incremental   # Only upload changed Next.js files (fast)
    python -m publish.upload_ionos --next-incremental  # Only upload changed Next.js files (fast)
"""

import hashlib
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
WEB_DIST = BASE / "web" / "dist"          # Vite SPA build output (--full-deploy)
NEXT_OUT = BASE / "web_2" / "out"         # Next.js static export output (--next-deploy)
ENV_FILE = BASE / ".env"
MANIFEST_FILE = Path(__file__).resolve().parent / "deploy_manifest_next.json"
DEPLOY_LOG = Path(__file__).resolve().parent / "deploy_log.jsonl"

# ── Security-hardened .htaccess content ──────────────────────────────────────
# CSP allows: self, PostHog analytics, Google Maps, CloudFront catalog CDN.
# Next.js static export requires 'unsafe-inline' for hydration script tags.
_SECURITY_HEADERS = """\
# Security headers (OWASP recommended)
<IfModule mod_headers.c>
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(self)"
  Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline'; connect-src 'self' https://us.i.posthog.com https://us-assets.i.posthog.com https://d2xsxph8kpxj0f.cloudfront.net https://*.supabase.co https://www.google-analytics.com https://analytics.google.com https://ipapi.co; img-src 'self' data: https: blob:; font-src 'self' data:; frame-src https://www.google.com https://maps.google.com; frame-ancestors 'none'; form-action 'self'; base-uri 'self'"
</IfModule>

"""

HTACCESS_NEXT = _SECURITY_HEADERS + """\
# StrainScout MD — Next.js Static Export
RewriteEngine On
RewriteBase /

# Force HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Add trailing slash for clean URLs (Next.js trailingSlash: true)
# Redirects /cheapest -> /cheapest/ so Apache finds cheapest/index.html
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_URI} !/$
RewriteCond %{REQUEST_URI} !\\.\\w+$
RewriteRule ^(.*)$ /$1/ [L,R=301]

# Enable gzip compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json
</IfModule>

# Cache static assets for 1 year, JSON for 1 day
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType application/json "access plus 1 day"
</IfModule>

# Custom 404 page (Next.js generates this as /404.html)
ErrorDocument 404 /404.html
"""

HTACCESS_SPA = _SECURITY_HEADERS + """\
# StrainScout MD — SPA Routing
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

# IONOS credentials — must be set in .env (no hardcoded fallbacks)
DEFAULT_HOST = os.environ.get("IONOS_SFTP_HOST", "")
DEFAULT_PORT = int(os.environ.get("IONOS_SFTP_PORT", "22"))
DEFAULT_USER = os.environ.get("IONOS_SFTP_USER", "")


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


def md5_file(path: Path) -> str:
    """Compute MD5 hash of a file."""
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def load_manifest() -> dict:
    """Load the previous deploy manifest {remote_path: md5}."""
    if MANIFEST_FILE.exists():
        try:
            return json.loads(MANIFEST_FILE.read_text())
        except Exception:
            pass
    return {}


def save_manifest(manifest: dict):
    """Save updated deploy manifest to disk."""
    MANIFEST_FILE.write_text(json.dumps(manifest, indent=2))


def catalog_hash() -> str:
    """Return MD5 of the catalog JSON in public/data/ (used in manifest to detect catalog changes)."""
    import re as _re
    candidates = list((BASE / "data" / "output").glob("strainscout_catalog_v*.min.json"))
    if not candidates:
        candidates = list((BASE / "web_2" / "public" / "data").glob("strainscout_catalog_v*.min.json"))
    if not candidates:
        return ""
    def version_key(p: Path) -> int:
        m = _re.search(r"_v(\d+)", p.name)
        return int(m.group(1)) if m else 0
    candidates.sort(key=version_key)
    return md5_file(candidates[-1])


def write_deploy_log(mode: str, uploaded: int, skipped: int, catalog_md5: str):
    """Append a JSON line to deploy_log.jsonl for auditing."""
    entry = {
        "ts": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "mode": mode,
        "uploaded": uploaded,
        "skipped": skipped,
        "catalog_md5": catalog_md5,
    }
    with open(DEPLOY_LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")


def ensure_remote_dirs(sftp, remote_path: str):
    """Ensure all parent directories of a remote path exist."""
    parts = remote_path.replace("\\", "/").lstrip("./").split("/")
    current = "."
    for part in parts[:-1]:  # skip the filename
        if not part:
            continue
        current = current + "/" + part
        try:
            sftp.mkdir(current)
        except IOError:
            pass  # already exists


def next_deploy_incremental(sftp):
    """Upload only changed/new files from web_2/out/ compared to last deploy.

    Uses a local manifest (deploy_manifest_next.json) tracking MD5 hashes of
    every previously uploaded file. Only uploads files whose hash changed or
    that are new. Skips identical files entirely, making repeated deploys fast.
    """
    if not NEXT_OUT.exists():
        print("ERROR: web_2/out/ not found. Run 'next build' in web_2/ first.")
        return False

    old_manifest = load_manifest()
    new_manifest = {}

    # Collect all files in the build output
    all_files = sorted(p for p in NEXT_OUT.rglob("*") if p.is_file())
    total = len(all_files)

    # Compute which files need uploading
    to_upload = []
    skipped = 0
    for local_path in all_files:
        rel = local_path.relative_to(NEXT_OUT)
        remote_path = "./" + rel.as_posix()
        file_hash = md5_file(local_path)
        new_manifest[remote_path] = file_hash
        if old_manifest.get(remote_path) == file_hash:
            skipped += 1
        else:
            to_upload.append((local_path, remote_path, file_hash))

    print(f"  Next.js incremental deploy from: {NEXT_OUT}")
    print(f"  {total} total files — {skipped} unchanged, {len(to_upload)} to upload")

    # Include catalog hash in manifest so a new catalog always triggers upload
    cat_md5 = catalog_hash()
    if cat_md5:
        new_manifest["__catalog_md5__"] = cat_md5
        if old_manifest.get("__catalog_md5__") != cat_md5:
            print(f"  Catalog changed ({cat_md5[:8]}…) — catalog upload will refresh")

    if not to_upload and old_manifest.get("__catalog_md5__") == cat_md5:
        print("  Nothing changed — skipping upload.")
        save_manifest(new_manifest)
        write_deploy_log("incremental", 0, skipped, cat_md5)
        return True

    # Upload changed/new files
    for local_path, remote_path, _ in to_upload:
        ensure_remote_dirs(sftp, remote_path)
        sftp.put(str(local_path), remote_path)
        size = local_path.stat().st_size
        print(f"    PUT: {remote_path} ({size:,} bytes)")

    print(f"\n  Uploaded {len(to_upload)} files, skipped {skipped} unchanged")

    # Upload .htaccess (always refresh it)
    with sftp.open("./.htaccess", "w") as f:
        f.write(HTACCESS_NEXT)
    print("    PUT: .htaccess")

    save_manifest(new_manifest)
    write_deploy_log("incremental", len(to_upload), skipped, cat_md5)
    print(f"  Manifest saved: {MANIFEST_FILE.name}")
    return True


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
    with sftp.open("./.htaccess", "w") as f:
        f.write(HTACCESS_SPA)
    print("    PUT: .htaccess (SPA routing)")

    write_deploy_log("full_spa", count, 0, catalog_hash())
    return True


def next_deploy(sftp):
    """Upload Next.js static export (web_2/out/) to IONOS.

    Next.js generates real HTML files per route, so no SPA rewrite is needed.
    The .htaccess handles HTTPS, compression, caching, and a clean 404 page.
    """
    if not NEXT_OUT.exists():
        print("ERROR: web_2/out/ not found. Run 'next build' in web_2/ first.")
        print("  cd web_2 && npm run build")
        return False

    print(f"  Next.js deploy from: {NEXT_OUT}")
    count = upload_recursive(sftp, NEXT_OUT, ".")
    print(f"  Uploaded {count} files")

    with sftp.open("./.htaccess", "w") as f:
        f.write(HTACCESS_NEXT)
    print("    PUT: .htaccess (Next.js static routing)")

    write_deploy_log("next_full", count, 0, catalog_hash())
    return True


def main(full_deploy_override=None):
    parser = argparse.ArgumentParser(description="Upload to IONOS webspace")
    parser.add_argument("--full-deploy", action="store_true",
                        help="Upload Vite SPA (web/dist/), not just catalog")
    parser.add_argument("--next-deploy", action="store_true",
                        help="Upload Next.js static export (web_2/out/) instead of Vite SPA")
    parser.add_argument("--next-incremental", action="store_true",
                        help="Only upload changed/new Next.js files (fast incremental deploy)")
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
        if args.next_incremental:
            success = upload_catalog_only(sftp) and next_deploy_incremental(sftp)
        elif args.next_deploy:
            success = upload_catalog_only(sftp) and next_deploy(sftp)
        elif args.full_deploy:
            success = full_deploy(sftp)
        else:
            success = upload_catalog_only(sftp)
    finally:
        sftp.close()
        transport.close()

    if success:
        print(f"\nUpload completed at {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    else:
        print("\nUpload FAILED")
        sys.exit(1)


if __name__ == "__main__":
    main()
