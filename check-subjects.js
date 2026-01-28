const axios = require('axios');
const cheerio = require('cheerio');

async function checkSubjects() {
    // Check a specific semester page
    const url = 'https://gturanker.com/papers/BE/02/3/';
    console.log('Checking:', url);

    const response = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });

    const $ = cheerio.load(response.data);

    console.log('\nAll links:');
    $('a[href]').each((i, elem) => {
        const href = $(elem).attr('href');
        const text = $(elem).text().trim();
        if (href && !href.startsWith('http') && href !== '../') {
            console.log(`  ${href} | "${text.substring(0, 60)}"`);
        }
    });
}

checkSubjects();
