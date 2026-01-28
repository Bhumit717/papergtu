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

        // Check ALL links
        const allLinks = [];
        $('a').each((i, elem) => {
            const href = $(elem).attr('href');
            const text = $(elem).text().trim();
            if (href) {
                allLinks.push({ href, text });
            }
        });

        console.log('\nTotal links found:', allLinks.length);
        console.log('\nFirst 30 links:');
        allLinks.slice(0, 30).forEach((link, idx) => {
            console.log(`${idx + 1}. ${link.href} | "${link.text.substring(0, 50)}"`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    }
}

debugScraper();
