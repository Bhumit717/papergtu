const axios = require('axios');
const cheerio = require('cheerio');

async function debugMain() {
    const url = 'https://gturanker.com/papers/BE/';
    console.log('Checking:', url);
    try {
        const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(response.data);

        $('a').each((i, el) => {
            const text = $(el).text().trim();
            const href = $(el).attr('href');
            if (text.toLowerCase().includes('year') || text.toLowerCase().includes('common')) {
                console.log(`Potential Common Link: ${href} | "${text}"`);
            }
        });
    } catch (e) { console.error(e.message); }
}
debugMain();
