/**
 * rehost-photos.ts
 *
 * Downloads hotlink-blocked school photos, uploads them to Supabase Storage,
 * then patches each school's report_data with a photo_grid content block.
 *
 * Run with:
 *   npx tsx scripts/rehost-photos.ts
 *   npx tsx scripts/rehost-photos.ts --dry-run   (download + upload only, no DB writes)
 *
 * Env vars required (loaded from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import path from 'path'

// ---------------------------------------------------------------------------
// Load .env.local
// ---------------------------------------------------------------------------
const envPath = path.resolve(process.cwd(), '.env.local')
const envLines = readFileSync(envPath, 'utf-8').split('\n')
for (const line of envLines) {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const DRY_RUN = process.argv.includes('--dry-run')
const BUCKET = 'school-photos'

// ---------------------------------------------------------------------------
// Photo definitions
// ---------------------------------------------------------------------------

interface PhotoSpec {
  url: string
  filename: string
  alt: string
  caption: string
}

interface SchoolSpec {
  slug: string
  /** Zero-based index of the section in report_data.sections to append the grid to */
  sectionIndex: number
  photos: PhotoSpec[]
}

const SCHOOLS: SchoolSpec[] = [
  {
    slug: 'edison-language-academy-santa-monica-ca',
    sectionIndex: 0,
    photos: [
      {
        url: 'https://kevindalyarchitects.com/wp-content/uploads/2019/11/Edison-KDA-02.jpg',
        filename: 'Edison-KDA-02.jpg',
        alt: 'Edison Language Academy campus exterior',
        caption:
          'Edison Language Academy: Two-story K-5 building on Virginia Avenue with 27 classrooms, solar chimneys, and courtyards. Kevin Daly Architects.',
      },
      {
        url: 'https://kevindalyarchitects.com/wp-content/uploads/2019/11/Edison-KDA-03.jpg',
        filename: 'Edison-KDA-03.jpg',
        alt: 'Edison Language Academy academic courtyard',
        caption:
          'The academic courtyard flanked by classrooms connected by bridges and landscaped platforms.',
      },
      {
        url: 'https://kevindalyarchitects.com/wp-content/uploads/2019/11/Edison-KDA-05.jpg',
        filename: 'Edison-KDA-05.jpg',
        alt: 'Edison Language Academy campus detail',
        caption:
          'Edison campus with stormwater reuse and natural ventilation systems.',
      },
    ],
  },
  {
    slug: 'walgrove-avenue-elementary-school-los-angeles-ca',
    sectionIndex: 0,
    photos: [
      {
        url: 'https://www.wearewalgrove.com/wp-content/uploads/2018/02/wildlands-banner.jpg',
        filename: 'wildlands-banner.jpg',
        alt: 'Walgrove Wildlands urban eco-lab',
        caption:
          'The Walgrove Wildlands: 25,000+ SF urban eco-lab created by removing asphalt to restore native Coastal Sage Scrub habitat.',
      },
    ],
  },
  {
    slug: 'roosevelt-elementary-school-santa-monica-ca',
    sectionIndex: 2,
    photos: [
      {
        url: 'https://www.moorerubleyudell.com/wp-content/uploads/2025/01/650-Roos_0001-scaled.jpg',
        filename: '650-Roos_0001.jpg',
        alt: 'Roosevelt Elementary master plan rendering',
        caption:
          'Rendering: Roosevelt Elementary master plan by Moore Ruble Yudell. New library, TK/K classrooms, and Maker Space while preserving 1930s WPA-era Historic District.',
      },
      {
        url: 'https://www.moorerubleyudell.com/wp-content/uploads/2025/01/650-Roos_0002.jpg',
        filename: '650-Roos_0002.jpg',
        alt: 'Roosevelt Elementary campus layout rendering',
        caption:
          'Rendering: New campus layout preserving the original quad as a focal point. $30M renovation funded by Measure QS.',
      },
      {
        url: 'https://www.moorerubleyudell.com/wp-content/uploads/2025/01/650-Roos_0003-scaled.jpg',
        filename: '650-Roos_0003.jpg',
        alt: 'Roosevelt Elementary indoor-outdoor learning spaces rendering',
        caption:
          'Rendering: Indoor-outdoor learning spaces honoring the original Santa Monica Plan design philosophy.',
      },
      {
        url: 'https://www.moorerubleyudell.com/wp-content/uploads/2025/01/650-Roos_0004-scaled.jpg',
        filename: '650-Roos_0004.jpg',
        alt: 'Roosevelt Elementary Montana Avenue entrance rendering',
        caption:
          'Rendering: Restored Montana Avenue entrance creating a welcoming neighborhood connection.',
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mimeFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
  }
  return map[ext ?? ''] ?? 'image/jpeg'
}

async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      Referer: new URL(url).origin + '/',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading ${url}`)
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  // --- Ensure bucket exists ---
  const { data: buckets } = await supabase.storage.listBuckets()
  const bucketExists = buckets?.some((b) => b.name === BUCKET)
  if (!bucketExists) {
    console.log(`Creating bucket "${BUCKET}"…`)
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024, // 10 MB
    })
    if (error) throw new Error(`Failed to create bucket: ${error.message}`)
    console.log(`Bucket "${BUCKET}" created.`)
  } else {
    console.log(`Bucket "${BUCKET}" already exists.`)
  }

  for (const school of SCHOOLS) {
    console.log(`\n=== ${school.slug} ===`)

    // --- Fetch current report_data ---
    const { data: row, error: fetchErr } = await supabase
      .from('schools')
      .select('report_data')
      .eq('id', school.slug)
      .single()

    if (fetchErr || !row) {
      console.error(`  ✗ Could not fetch school: ${fetchErr?.message ?? 'not found'}`)
      continue
    }

    const reportData = row.report_data as Record<string, unknown> | null
    if (!reportData) {
      console.error(`  ✗ report_data is null — skipping (insert a report first)`)
      continue
    }

    const sections = (reportData.sections ?? []) as Array<Record<string, unknown>>
    if (sections.length <= school.sectionIndex) {
      console.error(
        `  ✗ sections[${school.sectionIndex}] does not exist (only ${sections.length} sections)`
      )
      continue
    }

    // --- Download + upload each photo ---
    const uploadedPhotos: Array<{ src: string; alt: string; caption: string }> = []

    for (const photo of school.photos) {
      const storagePath = `${school.slug}/${photo.filename}`
      console.log(`  Downloading ${photo.filename}…`)

      let imageBuffer: Buffer
      try {
        imageBuffer = await downloadImage(photo.url)
        console.log(`    Downloaded ${(imageBuffer.byteLength / 1024).toFixed(0)} KB`)
      } catch (err) {
        console.error(`    ✗ Download failed: ${(err as Error).message}`)
        continue
      }

      if (DRY_RUN) {
        console.log(`    [dry-run] Would upload to ${BUCKET}/${storagePath}`)
        uploadedPhotos.push({ src: `[dry-run]/${storagePath}`, alt: photo.alt, caption: photo.caption })
        continue
      }

      // Upload (upsert so re-runs are safe)
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, imageBuffer, {
          contentType: mimeFromFilename(photo.filename),
          upsert: true,
        })

      if (uploadErr) {
        console.error(`    ✗ Upload failed: ${uploadErr.message}`)
        continue
      }

      const { data: publicUrlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(storagePath)

      const publicUrl = publicUrlData.publicUrl
      console.log(`    ✓ Uploaded → ${publicUrl}`)
      uploadedPhotos.push({ src: publicUrl, alt: photo.alt, caption: photo.caption })
    }

    if (uploadedPhotos.length === 0) {
      console.log(`  No photos uploaded — skipping report_data update.`)
      continue
    }

    // --- Build photo_grid block ---
    const photoGridBlock = {
      type: 'photo_grid',
      photos: uploadedPhotos,
    }

    // --- Append to the target section's content array ---
    const targetSection = sections[school.sectionIndex] as Record<string, unknown>
    const existingContent = (targetSection.content ?? []) as unknown[]

    // Remove any pre-existing photo_grid blocks so re-runs don't duplicate
    const filteredContent = existingContent.filter(
      (b) => (b as Record<string, unknown>).type !== 'photo_grid'
    )
    filteredContent.push(photoGridBlock)

    sections[school.sectionIndex] = { ...targetSection, content: filteredContent }

    const updatedReportData = { ...reportData, sections }

    if (DRY_RUN) {
      console.log(`  [dry-run] Would patch report_data.sections[${school.sectionIndex}] with:`)
      console.log(JSON.stringify(photoGridBlock, null, 2))
      continue
    }

    const { error: updateErr } = await supabase
      .from('schools')
      .update({ report_data: updatedReportData })
      .eq('id', school.slug)

    if (updateErr) {
      console.error(`  ✗ DB update failed: ${updateErr.message}`)
    } else {
      console.log(`  ✓ report_data updated (sections[${school.sectionIndex}] now has photo_grid with ${uploadedPhotos.length} photo${uploadedPhotos.length !== 1 ? 's' : ''})`)
    }
  }

  console.log('\nDone.')
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
