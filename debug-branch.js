const axios = require('axios');
const cheerio = require('cheerio');

async function debugBranch() {
    const url = 'https://gturanker.com/papers/BE/01/';
    console.log('Checking:', url);
    try {
        const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(response.data);

        $('a').each((i, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            if (href && href.includes('/papers/BE/')) {
                console.log(`LINK: ${href} | TEXT: "${text}"`);
            }
        });
    } catch (e) { console.error(e.message); }
}
debugBranch();
