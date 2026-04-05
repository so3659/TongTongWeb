import { supabase } from './supabaseClient';

/**
 * Cloudflare R2 Configuration (Frontend)
 * 
 * We NO LONGER store Secret Keys here.
 * We only store Public information needed to build the final URL.
 */

const R2_PUBLIC_DOMAIN = import.meta.env.VITE_R2_PUBLIC_DOMAIN; // e.g., https://pub-xxx.r2.dev

/**
 * Fetches a Presigned URL from Supabase Edge Function.
 * This is the SECURE way to handle uploads.
 */
export async function getPresignedUrl(fileName, contentType) {
  const { data, error } = await supabase.functions.invoke('get-r2-presigned-url', {
    body: { fileName, contentType },
  });

  if (error) {
    throw new Error(`Failed to get presigned URL: ${error.message}`);
  }

  return data.uploadUrl;
}

/**
 * Returns the public URL of a file in the R2 bucket.
 */
export function getR2PublicUrl(fileName) {
  return `${R2_PUBLIC_DOMAIN}/${fileName}`;
}
