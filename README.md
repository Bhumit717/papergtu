# GTU Papers Archive

A modern web application to browse and download GTU BE examination papers from gturanker.com.

## 🚀 Quick Start

### 1. Collect Papers (One-time setup)

```bash
# Test connectivity
node test-scraper.js

# Run the full scraper (takes 30-60 minutes)
node scraper.js

# Copy metadata to React app
copy papers_metadata.json gtu-papers-app\public\papers_metadata.json
```

### 2. Run the React App

```bash
cd gtu-papers-app
npm run dev
```

Visit: **http://localhost:5173/**

## ✨ Features

- 🎨 **Modern glassmorphism UI** with dark theme
- 📱 **Fully responsive** design
- 🔍 **Easy navigation**: Branch → Semester → Subject → Papers
- 📥 **Download or view** PDFs directly
- ⚡ **Fast and intuitive** user experience

## 📁 Project Structure

```
├── scraper.js              # Main scraper
├── test-scraper.js         # Connectivity test
├── papers/                 # Downloaded PDFs
├── papers_metadata.json    # Generated metadata
└── gtu-papers-app/         # React application
```

## 🎯 How It Works

1. **Scraper** collects all BE papers from gturanker.com
2. **Metadata** is generated with complete structure
3. **React app** provides beautiful interface to browse papers
4. **Users** can view or download any paper with one click

## 📝 Documentation

See [walkthrough.md](file:///C:/Users/bhumi/.gemini/antigravity/brain/0ffa0ce3-02fe-461d-8561-3f4df4f37cb9/walkthrough.md) for detailed documentation.

## 🛠️ Built With

- **Scraper**: Node.js, Axios, Cheerio
- **Frontend**: React, Vite
- **Design**: Custom CSS with glassmorphism

---

**Note**: The React app includes sample data, so you can test it before running the scraper!
