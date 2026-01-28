const fs = require('fs');
const path = require('path');

const METADATA_FILE = path.join(__dirname, 'gtu-papers-app', 'public', 'papers_metadata.json');

console.log(`Updating links in ${METADATA_FILE} to use local relative /papers/ path`);

try {
    const data = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));

    data.branches.forEach(branch => {
        branch.semesters.forEach(sem => {
            sem.subjects.forEach(subj => {
                subj.papers.forEach(paper => {
                    if (paper.localPath) {
                        // Restore local paths for localhost serving
                        const cleanPath = paper.localPath.replace(/\\/g, '/');
                        paper.downloadUrl = `/papers/${cleanPath}`;
                    }
                });
            });
        });
    });

    fs.writeFileSync(METADATA_FILE, JSON.stringify(data, null, 2));
    console.log('Metadata updated for Localhost successfully!');

} catch (err) {
    console.error('Error processing metadata:', err);
}
