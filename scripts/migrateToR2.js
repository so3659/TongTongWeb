import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * Cloudflare R2 & Supabase Migration Script
 * 
 * This script:
 * 1. Lists all files in Supabase Storage buckets.
 * 2. Downloads them.
 * 3. Uploads them to Cloudflare R2.
 */

// Environment Variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const R2_ACCOUNT_ID = process.env.VITE_R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.VITE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.VITE_R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.VITE_R2_BUCKET_NAME;

if (!SUPABASE_URL || !SUPABASE_KEY || !R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('Error: Missing environment variables for migration.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const buckets = [
  'post-images',
  'post-attachments',
  'profile-images',
  'executive-images',
  'activity-images',
];

/**
 * Recursively list all files in a bucket
 */
async function listFiles(bucketName, path = '') {
  let allFiles = [];
  const { data, error } = await supabase.storage.from(bucketName).list(path);
  
  if (error) {
    console.error(`Error listing files in ${bucketName}/${path}:`, error.message);
    return [];
  }

  for (const item of data) {
    const fullPath = path ? `${path}/${item.name}` : item.name;
    if (item.id === null) { // It's a folder
      const folderFiles = await listFiles(bucketName, fullPath);
      allFiles = allFiles.concat(folderFiles);
    } else {
      allFiles.push({ bucket: bucketName, path: fullPath, name: item.name });
    }
  }
  return allFiles;
}

async function migrate() {
  console.log('--- Starting Supabase to R2 Migration ---');

  for (const bucketName of buckets) {
    console.log(`\nProcessing Bucket: [${bucketName}]`);
    const files = await listFiles(bucketName);
    console.log(`- Found ${files.length} files.`);

    for (const file of files) {
      try {
        // 1. Download from Supabase
        const { data, error: downloadError } = await supabase.storage
          .from(file.bucket)
          .download(file.path);

        if (downloadError) {
          console.error(`  - Failed to download ${file.path}:`, downloadError.message);
          continue;
        }

        // 2. Prepare Buffer
        const arrayBuffer = await data.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 3. Upload to R2
        // We maintain the same folder structure: bucket-name/path/to/file
        const r2Key = `${file.bucket}/${file.path}`;
        
        await r2Client.send(new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: r2Key,
          Body: buffer,
          ContentType: data.type || 'application/octet-stream',
        }));

        console.log(`  - Migrated: ${file.path} -> R2:${r2Key}`);
      } catch (err) {
        console.error(`  - Error migrating ${file.path}:`, err.message);
      }
    }
  }

  console.log('\n--- Migration Finished ---');
}

migrate();
