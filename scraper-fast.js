const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const { createWriteStream, existsSync, mkdirSync } = require('fs');

class GTUPaperScraperFast {
    constructor(baseDir = 'papers') {
        this.baseUrl = 'https://gturanker.com/papers/BE/';
        this.baseDir = baseDir;
        this.metadata = { branches: [] };
        this.axiosInstance = axios.create({
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 30000
        });
        this.stats = {
            totalPapers: 0,
            downloaded: 0,
            failed: 0,
            skipped: 0
        };
        this.concurrentDownloads = 5; // Download 5 PDFs at a time
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async getPage(url, retries = 3) {
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const response = await this.axiosInstance.get(url);
                await this.delay(200); // Reduced delay for faster scraping
                return response.data;
            } catch (error) {
                if (attempt < retries - 1) {
                    await this.delay(1000);
                }
            }
        }
        return null;
    }

    async extractBranches() {
        console.log('Fetching branches...');
        const html = await this.getPage(this.baseUrl);
        if (!html) return [];

        const $ = cheerio.load(html);
        const branches = [];
        const seen = new Set();

        $('a[href]').each((i, elem) => {
            const href = $(elem).attr('href') || '';
            let branchName = $(elem).text().trim();

            // Look for relative URLs like "20/" or branch codes
            // Branch links are typically just numbers followed by /
            if (href.match(/^\d+\/$/)) {
                const branchCode = href.replace('/', '');

                // Clean up branch name
                branchName = branchName.replace(/^\d+\s*/, '');
                branchName = branchName.replace(/GTU BE\s*/g, '');
                branchName = branchName.replace(/\s*Papers$/g, '');

                if (branchCode && branchName && !seen.has(branchCode)) {
                    seen.add(branchCode);
                    branches.push({
                        code: branchCode,
                        name: branchName.trim()
                    });
                }
            }
        });

        console.log(`Found ${branches.length} branches`);
        return branches;
    }

    async extractSemesters(branchCode) {
        const url = `${this.baseUrl}${branchCode}/`;
        const html = await this.getPage(url);
        if (!html) return [];

        const $ = cheerio.load(html);
        const semesters = new Set();

        $('a[href]').each((i, elem) => {
            const href = $(elem).attr('href') || '';
            // Look for relative URLs like "3/" or "5/"
            if (href.match(/^\d+\/$/)) {
                const semNum = parseInt(href.replace('/', ''));
                if (!isNaN(semNum) && semNum >= 1 && semNum <= 8) {
                    semesters.add(semNum);
                }
            }
        });

        return Array.from(semesters).sort((a, b) => a - b);
    }

    async extractSubjects(branchCode, semester) {
        const url = `${this.baseUrl}${branchCode}/${semester}/`;
        const html = await this.getPage(url);
        if (!html) return [];

        const $ = cheerio.load(html);
        const subjects = [];
        const seen = new Set();

        $('a[href]').each((i, elem) => {
            const href = $(elem).attr('href') || '';
            let subjectCode = null;

            // Pattern 1: Absolute /papers/subject/12345/
            const matchAbsolute = href.match(/\/papers\/subject\/(\d{7})\//);
            if (matchAbsolute) {
                subjectCode = matchAbsolute[1];
            }

            // Pattern 2: Relative 12345/
            if (!subjectCode) {
                const matchRelative = href.match(/^(\d{7})\/$/);
                if (matchRelative) {
                    subjectCode = matchRelative[1];
                }
            }

            if (subjectCode) {
                let subjectName = $(elem).text().trim();
                subjectName = subjectName.replace(/^\d+\s*[/-]\s*/, '');
                subjectName = subjectName.replace(/\s*Papers$/g, '');

                if (subjectCode && subjectName) {
                    // Check exclusion if needed
                    if (!seen.has(subjectCode)) {
                        seen.add(subjectCode);
                        subjects.push({
                            code: subjectCode,
                            name: subjectName.trim()
                        });
                    }
                }
            }
        });

        return subjects;
    }

    async extractPapers(branchCode, semester, subjectCode) {
        // Use the /papers/subject/ URL format
        const url = `https://gturanker.com/papers/subject/${subjectCode}/`;
        const html = await this.getPage(url);
        if (!html) return [];

        const $ = cheerio.load(html);
        const papers = [];

        $('a[href]').each((i, elem) => {
            const href = $(elem).attr('href') || '';
            if (href.includes('gturanker.com/download/') && href.includes('paper=')) {
                const text = $(elem).text().trim();
                const yearMatch = text.match(/(Winter|Summer)\s+(\d{4})/);
                if (yearMatch) {
                    const year = `${yearMatch[1]} ${yearMatch[2]}`;
                    papers.push({
                        year: year,
                        downloadUrl: href
                    });
                }
            }
        });

        return papers;
    }

    async downloadPdf(url, savePath) {
        try {
            const dir = path.dirname(savePath);
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true });
            }

            if (existsSync(savePath)) {
                // Check if it's a valid PDF (larger than 1KB and starts with %PDF usually, but size check is good proxy)
                const stats = await fs.stat(savePath);
                if (stats.size > 1024) {
                    this.stats.skipped++;
                    return { success: true, skipped: true };
                }
            }

            // Step 1: Fetch the download page to get the secret data
            const pageResponse = await this.axiosInstance.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const $ = cheerio.load(pageResponse.data);
            const dataAttr = $('.a').attr('data');

            if (!dataAttr) {
                // Try direct download if it's not the intermediate page (fallback)
                // But for GTU Ranker it's usually always the intermediate page now
                throw new Error('Could not find download token on page');
            }

            // Step 2: Construct the real download URL
            const ts = Buffer.from(Date.now().toString()).toString('base64');
            // We can omit 'fn' parameter or just pass a dummy one, usually 'path' and 'ts' are enough
            // The Original script used: `https://drive.gturanker.org/?path=${data}&ts=${ts}&fn=...`
            const realPdfUrl = `https://drive.gturanker.org/?path=${dataAttr}&ts=${ts}`;

            // Step 3: Download the actual PDF
            const response = await this.axiosInstance.get(realPdfUrl, {
                responseType: 'stream',
                timeout: 60000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': url // Important to send referer
                }
            });

            const writer = createWriteStream(savePath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            // Verify it's not a small HTML error file
            const downloadedStats = await fs.stat(savePath);
            if (downloadedStats.size < 1000) {
                await fs.unlink(savePath);
                throw new Error('Downloaded file too small (likely error page)');
            }

            this.stats.downloaded++;
            await this.delay(200);
            return { success: true, skipped: false };
        } catch (error) {
            this.stats.failed++;
            // Remove failed/corrupted file if it exists
            if (existsSync(savePath)) {
                try { await fs.unlink(savePath); } catch (e) { }
            }
            return { success: false, error: error.message };
        }
    }

    async downloadBatch(papers) {
        const results = [];
        for (let i = 0; i < papers.length; i += this.concurrentDownloads) {
            const batch = papers.slice(i, i + this.concurrentDownloads);
            const promises = batch.map(item => this.downloadPdf(item.url, item.path));
            const batchResults = await Promise.all(promises);
            results.push(...batchResults);

            // Progress update
            const progress = Math.round((this.stats.downloaded + this.stats.skipped + this.stats.failed) / this.stats.totalPapers * 100);
            process.stdout.write(`\r  Progress: ${progress}% | Downloaded: ${this.stats.downloaded} | Skipped: ${this.stats.skipped} | Failed: ${this.stats.failed}`);
        }
        return results;
    }

    async scrapeAll() {
        console.log('='.repeat(70));
        console.log('GTU BE Papers Scraper - Fast Mode');
        console.log('='.repeat(70));
        console.log(`Concurrent downloads: ${this.concurrentDownloads}`);
        console.log('');

        const branches = await this.extractBranches();

        for (let idx = 0; idx < branches.length; idx++) {
            const branch = branches[idx];
            const { code: branchCode, name: branchName } = branch;

            console.log(`\n[${idx + 1}/${branches.length}] Processing: ${branchName} (${branchCode})`);

            // Find or create branch in metadata
            let branchEntry = this.metadata.branches.find(b => b.code === branchCode);
            if (!branchEntry) {
                branchEntry = {
                    code: branchCode,
                    name: branchName,
                    semesters: []
                };
                this.metadata.branches.push(branchEntry);
            }

            const semesters = await this.extractSemesters(branchCode);
            console.log(`  Found ${semesters.length} semesters`);

            for (const semester of semesters) {
                console.log(`  Semester ${semester}:`);

                // Find or create semester in metadata
                let semesterEntry = branchEntry.semesters.find(s => s.number === semester);
                if (!semesterEntry) {
                    semesterEntry = {
                        number: semester,
                        subjects: []
                    };
                    branchEntry.semesters.push(semesterEntry);
                }

                const subjects = await this.extractSubjects(branchCode, semester);
                console.log(`    Found ${subjects.length} subjects`);

                for (const subject of subjects) {
                    const { code: subjectCode, name: subjectName } = subject;
                    console.log(`    - ${subjectName} (${subjectCode})`);

                    const papers = await this.extractPapers(branchCode, semester, subjectCode);

                    if (papers.length > 0) {
                        console.log(`      Found ${papers.length} papers`);

                        // Prepare download batch
                        const downloadTasks = papers.map(paper => {
                            const year = paper.year.replace(/\s+/g, '_');
                            const filename = `${year}.pdf`;
                            const savePath = path.join(
                                this.baseDir,
                                branchCode,
                                semester.toString(),
                                subjectCode,
                                filename
                            );

                            // Store relative path for React app
                            const relativePath = path.join(
                                branchCode,
                                semester.toString(),
                                subjectCode,
                                filename
                            ).replace(/\\/g, '/');

                            return {
                                url: paper.downloadUrl,
                                path: savePath,
                                relativePath: relativePath,
                                paper: paper
                            };
                        });

                        this.stats.totalPapers += downloadTasks.length;

                        // Download in batches
                        await this.downloadBatch(downloadTasks);

                        // Update papers with local paths
                        papers.forEach((paper, idx) => {
                            paper.localPath = downloadTasks[idx].relativePath;
                        });

                        console.log(''); // New line after progress

                        subject.papers = papers;

                        // Update subject in metadata
                        const existingSubjectIndex = semesterEntry.subjects.findIndex(s => s.code === subjectCode);
                        if (existingSubjectIndex >= 0) {
                            semesterEntry.subjects[existingSubjectIndex] = subject;
                        } else {
                            semesterEntry.subjects.push(subject);
                        }

                        // Save metadata immediately after each subject
                        await this.saveMetadata();
                    }
                }
            }
        }

        console.log('\n' + '='.repeat(70));
        console.log('Scraping completed!');
        console.log(`Total papers found: ${this.stats.totalPapers}`);
        console.log(`Downloaded: ${this.stats.downloaded}`);
        console.log(`Skipped (already exist): ${this.stats.skipped}`);
        console.log(`Failed: ${this.stats.failed}`);
        console.log(`Metadata saved to: papers_metadata.json`);
        console.log('='.repeat(70));
    }

    async saveMetadata() {
        await fs.writeFile(
            'papers_metadata.json',
            JSON.stringify(this.metadata, null, 2),
            'utf-8'
        );
    }
}

// Run the scraper
(async () => {
    const scraper = new GTUPaperScraperFast();
    await scraper.scrapeAll();
})();
