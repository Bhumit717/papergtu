const axios = require('axios');
const cheerio = require('cheerio');

async function debugSemester() {
    const url = 'https://gturanker.com/papers/BE/01/2/';
    console.log('Checking:', url);
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(response.data);

        const links = [];
        $('a').each((i, el) => {
            const href = $(el).attr('href');
            if (href && (href.match(/\d/) || href.includes('subject'))) {
                links.push(href);
            }
        });

        console.log(`Found ${links.length} links with digits/subject.`);
        links.forEach(l => console.log(`LINK: ${l}`));

    } catch (e) {
        console.error(e.message);
    }
}
debugSemester();
