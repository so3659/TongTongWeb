import { createClient } from '@supabase/supabase-js';

// Get environment variables
// Use VITE_SUPABASE_SERVICE_ROLE_KEY for administrative access (list/delete files from other users)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: Missing environment variables.');
  console.log('Usage: VITE_SUPABASE_URL=... VITE_SUPABASE_SERVICE_ROLE_KEY=... node scripts/cleanupStorage.js');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const buckets = [
  { name: 'post-images', table: 'posts', column: 'media_urls', isArray: true },
  { name: 'post-attachments', table: 'posts', column: 'attachments', isJson: true },
  { name: 'profile-images', table: 'profiles', column: 'avatar_url' },
  { name: 'executive-images', table: 'club_executives', column: 'image_url' },
  { name: 'activity-images', table: 'club_activities', column: 'image_url' },
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
    if (item.id === null) { // It's a folder (id is null in Supabase list)
      const folderFiles = await listFiles(bucketName, fullPath);
      allFiles = allFiles.concat(folderFiles);
    } else {
      allFiles.push(fullPath);
    }
  }
  return allFiles;
}

/**
 * Extract the storage path from a public URL
 */
function extractPath(url, bucketName) {
  if (!url || typeof url !== 'string') return null;
  const parts = url.split(`/${bucketName}/`);
  if (parts.length > 1) {
    // Remove query params (like ?t=...)
    return parts[parts.length - 1].split('?')[0];
  }
  return null;
}

async function cleanup() {
  console.log('--- Starting Orphaned Files Cleanup ---');

  for (const bucket of buckets) {
    console.log(`\nBucket: [${bucket.name}]`);
    
    // 1. List all files currently in storage
    const storageFiles = await listFiles(bucket.name);
    console.log(`- Files in storage: ${storageFiles.length}`);

    // 2. Fetch all referenced files from DB
    const { data: dbRows, error: dbError } = await supabase
      .from(bucket.table)
      .select(bucket.column);
    
    if (dbError) {
      console.error(`- Error fetching from DB table ${bucket.table}:`, dbError.message);
      continue;
    }

    const referencedFiles = new Set();
    dbRows.forEach(row => {
      const val = row[bucket.column];
      if (!val) return;

      if (bucket.isArray && Array.isArray(val)) {
        val.forEach(url => {
          const path = extractPath(url, bucket.name);
          if (path) referencedFiles.add(path);
        });
      } else if (bucket.isJson && Array.isArray(val)) {
        // e.g., attachments is JSONB ARRAY [{name, url, size}]
        val.forEach(file => {
          const path = extractPath(file.url, bucket.name);
          if (path) referencedFiles.add(path);
        });
      } else {
        const path = extractPath(val, bucket.name);
        if (path) referencedFiles.add(path);
      }
    });
    console.log(`- Unique references in DB: ${referencedFiles.size}`);

    // 3. Find Orphaned Files (In Storage but NOT in DB)
    const orphanedFiles = storageFiles.filter(file => !referencedFiles.has(file));
    console.log(`- Orphaned files found: ${orphanedFiles.length}`);

    if (orphanedFiles.length > 0) {
      // Chunk deletion to avoid potential API limits (max 1000 per request is common)
      const chunkSize = 100;
      for (let i = 0; i < orphanedFiles.length; i += chunkSize) {
        const chunk = orphanedFiles.slice(i, i + chunkSize);
        console.log(`  - Deleting chunk ${Math.floor(i / chunkSize) + 1}...`);
        const { error: deleteError } = await supabase.storage.from(bucket.name).remove(chunk);
        
        if (deleteError) {
          console.error(`  - Error deleting files in ${bucket.name}:`, deleteError.message);
        }
      }
      console.log(`- Cleanup complete for ${bucket.name}.`);
    } else {
      console.log(`- No orphaned files to delete.`);
    }
  }

  console.log('\n--- Cleanup process finished. ---');
}

cleanup();
