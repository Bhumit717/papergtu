const axios = require('axios');
const cheerio = require('cheerio');

async function debugScraper() {
    try {
        console.log('Fetching GTU Ranker BE page...');
        const response = await axios.get('https://gturanker.com/papers/BE/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        console.log('Status:', response.status);
        console.log('Content length:', response.data.length);

        const $ = cheerio.load(response.data);

        // Check all links
        const allLinks = [];
        $('a[href]').each((i, elem) => {
            const href = $(elem).attr('href');
            if (href && href.includes('/papers/BE/')) {
                allLinks.push({
                    href: href,
                    text: $(elem).text().trim(),
                    parts: href.split('/').length
                });
            }
        });

        console.log('\nTotal BE links found:', allLinks.length);
        console.log('\nSample links:');
        allLinks.slice(0, 10).forEach(link => {
            console.log(`  Parts: ${link.parts} | ${link.href} | "${link.text}"`);
        });

        // Check for branch links (should have 6 parts)
        const branchLinks = allLinks.filter(l => l.parts === 6);
        console.log('\nBranch links (6 parts):', branchLinks.length);
        branchLinks.slice(0, 5).forEach(link => {
            console.log(`  ${link.href} | "${link.text}"`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    }
}

debugScraper();
