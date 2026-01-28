const fs = require('fs-extra');
const path = require('path');

async function copyPapers() {
    const source = path.join(__dirname, 'papers');
    const destination = path.join(__dirname, 'gtu-papers-app', 'public', 'papers');

    console.log('Copying papers to React app...');
    console.log(`Source: ${source}`);
    console.log(`Destination: ${destination}`);

    if (!fs.existsSync(source)) {
        console.error('❌ Papers folder not found! Run the scraper first.');
        process.exit(1);
    }

    try {
        await fs.copy(source, destination, {
            overwrite: true,
            filter: (src) => {
                // Only copy PDF files and directories
                return fs.statSync(src).isDirectory() || src.endsWith('.pdf');
            }
        });

        console.log('✅ Papers copied successfully!');

        // Get stats
        const stats = await getStats(destination);
        console.log(`\nTotal PDFs copied: ${stats.files}`);
        console.log(`Total size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    } catch (error) {
        console.error('❌ Error copying papers:', error.message);
        process.exit(1);
    }
}

async function getStats(dir) {
    let files = 0;
    let size = 0;

    async function walk(directory) {
        const items = await fs.readdir(directory);

        for (const item of items) {
            const fullPath = path.join(directory, item);
            const stat = await fs.stat(fullPath);

            if (stat.isDirectory()) {
                await walk(fullPath);
            } else if (item.endsWith('.pdf')) {
                files++;
                size += stat.size;
            }
        }
    }

    await walk(dir);
    return { files, size };
}

// Install fs-extra if needed
const { execSync } = require('child_process');
try {
    require.resolve('fs-extra');
} catch (e) {
    console.log('Installing fs-extra...');
    execSync('npm install fs-extra', { stdio: 'inherit', cwd: __dirname });
}

copyPapers();
