# GTU Papers - Fast Download Instructions

## 🚀 Quick Start - Download All Papers

### Step 1: Run the Fast Scraper

```bash
cd "c:\Users\bhumi\Desktop\AI learning\GTUA PAPER"
node scraper-fast.js
```

**What it does:**
- Downloads 5 PDFs simultaneously (parallel downloads)
- Shows real-time progress (percentage, downloaded, skipped, failed)
- Skips already downloaded files (resume-friendly)
- Saves all PDFs to `papers/` folder
- Generates `papers_metadata.json` with local paths

**Expected time:** 2-4 hours for 50,000+ papers (depending on internet speed)

### Step 2: Copy Papers to React App

After downloading completes:

```bash
# Copy metadata
copy papers_metadata.json gtu-papers-app\public\papers_metadata.json

# Copy all PDFs (this may take a few minutes)
node copy-papers.js
```

**OR** use symbolic link (faster, no copying):

```bash
# Create symbolic link (run as Administrator)
cd gtu-papers-app\public
mklink /D papers "..\..\papers"
```

### Step 3: Restart React App

```bash
cd gtu-papers-app
npm run dev
```

Now all PDFs will be served locally from your own server! 🎉

## 📊 Progress Monitoring

While scraping, you'll see:
```
Progress: 45% | Downloaded: 2250 | Skipped: 150 | Failed: 12
```

- **Downloaded**: New PDFs downloaded
- **Skipped**: Already exist (resume support)
- **Failed**: Network errors (will retry)

## ⚡ Performance Tips

1. **Resume Support**: If interrupted, just run `node scraper-fast.js` again
2. **Increase Speed**: Edit `scraper-fast.js` line 23:
   ```javascript
   this.concurrentDownloads = 10; // Increase from 5 to 10
   ```
3. **Check Progress**: Metadata is saved after each branch completes

## 🔧 Troubleshooting

**Problem**: Scraper is slow
- Increase `concurrentDownloads` (but not too high, or you'll get rate-limited)
- Check your internet speed

**Problem**: Many failed downloads
- Reduce `concurrentDownloads` to 3
- GTU Ranker might be rate-limiting

**Problem**: Out of disk space
- Each PDF is ~1-5 MB
- 50,000 papers ≈ 50-250 GB
- Ensure you have enough space!

## 📁 File Structure After Download

```
GTUA PAPER/
├── papers/                    # All downloaded PDFs
│   ├── CE/
│   │   ├── 3/
│   │   │   ├── 2130601/
│   │   │   │   ├── Winter_2024.pdf
│   │   │   │   └── Summer_2024.pdf
│   │   │   └── ...
│   │   └── ...
│   └── ...
├── papers_metadata.json       # Metadata with local paths
└── gtu-papers-app/
    └── public/
        ├── papers/            # Copied or linked PDFs
        └── papers_metadata.json
```

## ✅ Verification

After setup, your React app will:
- ✅ Load papers from local `/papers/` folder
- ✅ No redirects to GTU Ranker
- ✅ Faster loading (local files)
- ✅ Works offline (after download)

---

**Ready to start?** Run: `node scraper-fast.js`
