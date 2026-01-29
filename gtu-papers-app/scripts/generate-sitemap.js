import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://papergtu.vercel.app';
const METADATA_PATH = './gtu-papers-app/public/papers_metadata.json';
const SITEMAP_PATH = './gtu-papers-app/public/sitemap.xml';

async function generateSitemap() {
    console.log('Generating sitemap...');

    if (!fs.existsSync(METADATA_PATH)) {
        console.error('Metadata file not found!');
        return;
    }

    const data = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf-8'));
    const urls = [];

    // 1. Home
    urls.push(`${BASE_URL}/`);

    data.branches.forEach(branch => {
        const branchUrl = `${BASE_URL}/${encodeURIComponent(branch.name)}`;
        urls.push(branchUrl);

        branch.semesters.forEach(sem => {
            if (sem.subjects.length === 0) return;

            const semName = sem.number === 1 ? "First Year" : `Semester ${sem.number}`;
            const semUrl = `${branchUrl}/${encodeURIComponent(semName)}`;
            urls.push(semUrl);

            sem.subjects.forEach(subject => {
                const subjectUrl = `${semUrl}/${encodeURIComponent(subject.name)}`;
                urls.push(subjectUrl);
            });
        });
    });

    console.log(`Total URLs found: ${urls.length}`);

    // Generate XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.replace(/&/g, '&amp;')}</loc>
    <changefreq>weekly</changefreq>
    <priority>${url === BASE_URL + '/' ? '1.0' : url.split('/').length > 5 ? '0.6' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>`;

    fs.writeFileSync(SITEMAP_PATH, xml, 'utf-8');
    console.log(`Sitemap saved to ${SITEMAP_PATH}`);
}

generateSitemap().catch(console.error);
