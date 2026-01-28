import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PAPERS_DIR = path.join(__dirname, '../../papers');
const METADATA_FILE = path.join(__dirname, '../../papers_metadata.json');
const OUTPUT_METADATA_FILE = path.join(__dirname, '../public/papers_metadata.json');

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'gtu-papers';
const PUBLIC_URL_BASE = process.env.R2_PUBLIC_URL_BASE; // e.g. https://papers.example.com

if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
    console.error("Error: limit R2 credentials. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env");
    process.exit(1);
}

const client = new S3Client({
    region: "auto",
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
    },
});

async function uploadFile(filePath, key) {
    const fileStream = fs.createReadStream(filePath);
    const contentType = mime.lookup(filePath) || 'application/octet-stream';

    try {
        const parallelUploads3 = new Upload({
            client: client,
            params: {
                Bucket: BUCKET_NAME,
                Key: key,
                Body: fileStream,
                ContentType: contentType,
            },
        });

        parallelUploads3.on("httpUploadProgress", (progress) => {
            // console.log(progress);
        });

        await parallelUploads3.done();
        console.log(`Uploaded: ${key}`);
        return true;
    } catch (e) {
        console.error(`Failed to upload ${key}:`, e);
        return false;
    }
}

async function main() {
    console.log("Loading metadata...");
    if (!fs.existsSync(METADATA_FILE)) {
        console.error("Metadata file not found!");
        return;
    }

    // Check if papers dir exists
    if (!fs.existsSync(PAPERS_DIR)) {
        console.error(`Papers directory not found at ${PAPERS_DIR}`);
        return;
    }

    const metadata = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf-8'));
    let uploadCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // Recursive traversal to find all papers
    async function processNode(node) {
        if (node.papers && Array.isArray(node.papers)) {
            for (let i = 0; i < node.papers.length; i++) {
                const paper = node.papers[i];
                if (paper.localPath) {
                    const localFile = path.join(PAPERS_DIR, paper.localPath);
                    const cloudKey = paper.localPath.replace(/\\/g, '/'); // Ensure forward slashes

                    if (fs.existsSync(localFile)) {
                        console.log(`Processing ${paper.localPath}...`);
                        // Upload
                        const success = await uploadFile(localFile, cloudKey);
                        if (success) {
                            uploadCount++;
                            // Update metadata
                            if (PUBLIC_URL_BASE) {
                                paper.downloadUrl = `${PUBLIC_URL_BASE}/${cloudKey}`;
                                // Optionally remove localPath or keep it. 
                                // Removing it forces the app to use downloadUrl.
                                delete paper.localPath;
                            } else {
                                // If no public URL provided, we assume the bucket is mapped later?
                                // Better to keep localPath or set a placeholder?
                                // We'll keep localPath but maybe add r2Key?
                                paper.r2Key = cloudKey;
                            }
                        } else {
                            errorCount++;
                        }
                    } else {
                        console.warn(`File missing locally: ${paper.localPath}`);
                        skipCount++;
                    }
                }
            }
        }

        // Traverse children
        if (node.branches) await Promise.all(node.branches.map(processNode));
        if (node.semesters) await Promise.all(node.semesters.map(processNode));
        if (node.subjects) await Promise.all(node.subjects.map(processNode));
    }

    await processNode(metadata);

    console.log(`Upload Complete. Uploaded: ${uploadCount}, Skipped: ${skipCount}, Errors: ${errorCount}`);

    // Save updated metadata to public folder for the app
    fs.writeFileSync(OUTPUT_METADATA_FILE, JSON.stringify(metadata, null, 2));
    console.log(`Updated metadata saved to ${OUTPUT_METADATA_FILE}`);
}

main().catch(console.error);
