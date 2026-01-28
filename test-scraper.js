const axios = require('axios');
const cheerio = require('cheerio');

async function testScraper() {
    console.log('Testing GTU Ranker website access...\n');

    try {
        const response = await axios.get('https://gturanker.com/papers/BE/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });

        console.log('✓ Successfully connected to GTU Ranker');
        console.log(`Status: ${response.status}`);

        const $ = cheerio.load(response.data);
        const branches = [];

        $('a[href]').each((i, elem) => {
            const href = $(elem).attr('href') || '';
            if (href.includes('/papers/BE/') && href.split('/').length === 6) {
                const parts = href.replace(/\/$/, '').split('/');
                if (parts.length >= 5) {
                    const branchCode = parts[parts.length - 1];
                    let branchName = $(elem).text().trim();

                    if (branchCode && branchName && !branches.find(b => b.code === branchCode)) {
                        branches.push({
                            code: branchCode,
                            name: branchName
                        });
                    }
                }
            }
        });

        console.log(`\n✓ Found ${branches.length} branches:`);
        branches.slice(0, 5).forEach(b => {
            console.log(`  - ${b.name} (${b.code})`);
        });

        if (branches.length > 5) {
            console.log(`  ... and ${branches.length - 5} more`);
        }

        console.log('\n✓ Scraper is working correctly!');
        console.log('\nTo collect all papers, run: node scraper.js');
        console.log('Note: This will take several minutes and download many PDFs.');

    } catch (error) {
        console.error('✗ Error:', error.message);
        console.log('\nPossible issues:');
        console.log('  - No internet connection');
        console.log('  - GTU Ranker website is down');
        console.log('  - Firewall blocking the request');
    }
}

testScraper();
