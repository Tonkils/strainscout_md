# First Time Setup

## 1. Install dependencies
```bash
pip install requests playwright beautifulsoup4 lxml boto3 python-dotenv tqdm
playwright install chromium
```

## 2. Configure environment
Edit `.env` with your AWS credentials and S3 bucket name.

## 3. Run
```bash
python run_all.py
```
