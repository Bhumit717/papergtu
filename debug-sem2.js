const axios = require('axios');
const cheerio = require('cheerio');

const fs = require('fs');

async function debugSemester() {
    const urls = [
        'https://gturanker.com/papers/BE/01/2/',
        'https://gturanker.com/papers/BE/02/2/'
    ];

    let output = '';
    for (const url of urls) {
        output += `\nChecking: ${url}\n`;
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const $ = cheerio.load(response.data);

            $('a[href]').each((i, elem) => {
                const href = $(elem).attr('href');
                if (href && (href.includes('subject') || href.match(/\d/))) {
                    output += `LINK: ${href}\n`;
                }
            });

        } catch (e) {
            output += `Error: ${e.message}\n`;
        }
    }
    fs.writeFileSync('log.txt', output);
    console.log('Done writing debug log.');
}

debugSemester();
