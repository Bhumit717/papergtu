const axios = require('axios');
const cheerio = require('cheerio');

async function scanSemesters() {
    const branchCode = '07';
    for (let sem = 1; sem <= 2; sem++) {
        const url = `https://gturanker.com/papers/BE/${branchCode}/${sem}/`;
        console.log(`Scanning Sem ${sem}: ${url}`);

        try {
            const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const $ = cheerio.load(response.data);

            let count = 0;
            $('a').each((i, el) => {
                const href = $(el).attr('href');
                if (href && (href.match(/\/papers\/subject\/\d{7}\//) || href.match(/^\d{7}\/$/))) {
                    count++;
                }
            });
            console.log(`  Found ${count} subjects`);
            if (count > 0) {
                // Print first one
                console.log('  First:', $('a[href*="subject"]', 'a[href*="/"]').first().attr('href'));
            }
        } catch (e) {
            console.log('  Error:', e.message);
        }
    }
}
scanSemesters();
