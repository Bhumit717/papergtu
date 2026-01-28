const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const { createWriteStream, existsSync, mkdirSync } = require('fs');

class GTUPaperScraper {
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
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async getPage(url, retries = 3) {
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const response = await this.axiosInstance.get(url);
                await this.delay(500); // Rate limiting
                return response.data;
            } catch (error) {
                console.log(`Error fetching ${url} (attempt ${attempt + 1}/${retries}): ${error.message}`);
                if (attempt < retries - 1) {
                    await this.delay(2000);
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
            if (href.includes('/papers/BE/') && href.split('/').length === 6) {
                const parts = href.replace(/\/$/, '').split('/');
                if (parts.length >= 5) {
                    const branchCode = parts[parts.length - 1];
                    let branchName = $(elem).text().trim();

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
            if (href.includes(`/papers/BE/${branchCode}/`) && href.split('/').length === 7) {
                const parts = href.replace(/\/$/, '').split('/');
                const semNum = parseInt(parts[parts.length - 1]);
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
            if (href.includes(`/papers/BE/${branchCode}/${semester}/`) && href.split('/').length === 8) {
                const parts = href.replace(/\/$/, '').split('/');
                const subjectCode = parts[parts.length - 1];
                let subjectName = $(elem).text().trim();

                // Clean up subject name
                subjectName = subjectName.replace(/^\d+\s*[/-]\s*/, '');
                subjectName = subjectName.replace(/\s*Papers$/g, '');

                if (subjectCode && subjectName && !seen.has(subjectCode)) {
                    seen.add(subjectCode);
                    subjects.push({
                        code: subjectCode,
                        name: subjectName.trim()
                    });
                }
            }
        });

        return subjects;
    }

    async extractPapers(branchCode, semester, subjectCode) {
        const url = `${this.baseUrl}${branchCode}/${semester}/${subjectCode}/`;
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
                console.log(`  ✓ Already exists: ${savePath}`);
                return true;
            }

            const response = await this.axiosInstance.get(url, {
                responseType: 'stream',
                timeout: 60000
            });

            const writer = createWriteStream(savePath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            console.log(`  ✓ Downloaded: ${savePath}`);
            await this.delay(500);
            return true;
        } catch (error) {
            console.log(`  ✗ Failed to download ${url}: ${error.message}`);
            return false;
        }
    }

    async scrapeAll() {
        console.log('='.repeat(60));
        console.log('GTU BE Papers Scraper');
        console.log('='.repeat(60));

        const branches = await this.extractBranches();

        for (let idx = 0; idx < branches.length; idx++) {
            const branch = branches[idx];
            const { code: branchCode, name: branchName } = branch;

            console.log(`\n[${idx + 1}/${branches.length}] Processing: ${branchName} (${branchCode})`);

            const branchData = {
                code: branchCode,
                name: branchName,
                semesters: []
            };

            const semesters = await this.extractSemesters(branchCode);
            console.log(`  Found ${semesters.length} semesters`);

            for (const semester of semesters) {
                console.log(`  Semester ${semester}:`);

                const semesterData = {
                    number: semester,
                    subjects: []
                };

                const subjects = await this.extractSubjects(branchCode, semester);
                console.log(`    Found ${subjects.length} subjects`);

                for (const subject of subjects) {
                    const { code: subjectCode, name: subjectName } = subject;
                    console.log(`    - ${subjectName} (${subjectCode})`);

                    const papers = await this.extractPapers(branchCode, semester, subjectCode);

                    if (papers.length > 0) {
                        console.log(`      Found ${papers.length} papers`);

                        for (const paper of papers) {
                            const year = paper.year.replace(/\s+/g, '_');
                            const filename = `${year}.pdf`;
                            const savePath = path.join(
                                this.baseDir,
                                branchCode,
                                semester.toString(),
                                subjectCode,
                                filename
                            );

                            await this.downloadPdf(paper.downloadUrl, savePath);
                            paper.localPath = savePath;
                        }

                        subject.papers = papers;
                        semesterData.subjects.push(subject);
                    }
                }

                if (semesterData.subjects.length > 0) {
                    branchData.semesters.push(semesterData);
                }
            }

            if (branchData.semesters.length > 0) {
                this.metadata.branches.push(branchData);
            }

            await this.saveMetadata();
        }

        console.log('\n' + '='.repeat(60));
        console.log('Scraping completed!');
        console.log(`Total branches: ${this.metadata.branches.length}`);
        console.log('Metadata saved to: papers_metadata.json');
        console.log('='.repeat(60));
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
    const scraper = new GTUPaperScraper();
    await scraper.scrapeAll();
})();
