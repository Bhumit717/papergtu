const axios = require('axios');
const cheerio = require('cheerio');

async function debugSemester() {
    const urls = [
        'https://gturanker.com/papers/BE/01/1/',
        'https://gturanker.com/papers/BE/01/3/'
    ];

    for (const url of urls) {
        console.log('\nChecking:', url);
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const $ = cheerio.load(response.data);

            const subjects = [];
            $('a[href]').each((i, elem) => {
                const href = $(elem).attr('href');
                // Check if it matches our scraper pattern: /\/papers\/subject\/\d{7}\//
                const match1 = href.match(/\/papers\/subject\/\d{7}\//);
                // Also check if there are other patterns like relative links
                const match2 = href.match(/^\d{7}\/$/); // e.g. "3110005/"

                if (match1 || match2 || href.includes('subject')) {
                    subjects.push(href);
                }
            });

            console.log(`Found ${subjects.length} subject links`);
            if (subjects.length > 0) {
                console.log('Sample:', subjects.slice(0, 3));
            } else {
                console.log('No subject links found! Listing ALL links:');
                $('a[href]').each((i, e) => {
                    const h = $(e).attr('href');
                    if (h && !h.startsWith('http') && h.length > 2) console.log('  ', h);
                });
            }

        } catch (e) {
            console.error(e.message);
        }
    }
}

debugSemester();
