const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const prisma = new PrismaClient();
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'PrivacyPicture';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Supabase env vars missing; aborting backfill.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { autoRefreshToken: false } });

function extractPathFromSignedUrl(url) {
  // matches /storage/v1/object/sign/<bucket>/<path>?token=...
  try {
    const m = url.match(/\/storage\/v1\/object\/sign\/[^\/]+\/(.+?)(?:\?|$)/);
    if (m && m[1]) return decodeURIComponent(m[1]);
  } catch (e) {
    return null;
  }
  return null;
}

async function run() {
  console.log('Starting backfill of FeedMedia storage paths...');
  const medias = await prisma.feedMedia.findMany({ where: { OR: [{ storagePath: null }, { storagePath: '' }] } });
  console.log(`Found ${medias.length} medias with empty storagePath.`);
  let updated = 0;
  for (const m of medias) {
    const url = m.url || '';
    const thumb = m.thumbnailUrl || '';
    const needsMain = url.includes('/storage/v1/object/sign/') || !m.storagePath;
    const mainPath = needsMain ? extractPathFromSignedUrl(url) : m.storagePath;
    const thumbPath = thumb.includes('/storage/v1/object/sign/') ? extractPathFromSignedUrl(thumb) : m.thumbnailPath;
    if (!mainPath && !thumbPath) continue;

    const updates = {};
    if (mainPath) {
      updates.storagePath = mainPath;
      const publicMain = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(mainPath);
      updates.url = publicMain?.data?.publicUrl || m.url;
    }
    if (thumbPath) {
      updates.thumbnailPath = thumbPath;
      const publicThumb = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(thumbPath);
      updates.thumbnailUrl = publicThumb?.data?.publicUrl || m.thumbnailUrl;
    }

    try {
      await prisma.feedMedia.update({ where: { id: m.id }, data: updates });
      updated++;
      console.log(`Updated media ${m.id}`);
    } catch (e) {
      console.error('Failed to update media', m.id, e.message || e);
    }
  }
  console.log(`Backfill complete. Updated ${updated} / ${medias.length} entries.`);
  await prisma.$disconnect();
  process.exit(0);
}

run().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
