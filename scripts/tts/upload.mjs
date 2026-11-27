// Upload generated lesson audio to the private `lesson-audio` Supabase bucket.
//
//   node --env-file=.env.local scripts/tts/upload.mjs
//
// Safe to repeat: audio already there is skipped (file names carry a content
// hash), manifests are overwritten, and files no manifest refers to are removed.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "lesson-audio";
const ROOT = join(import.meta.dirname, "..", "..", "public", "lesson-audio");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const storage = createClient(url, key, { auth: { persistSession: false } }).storage;

const check = ({ data, error }, what) => {
  if (error) throw new Error(`${what}: ${error.message}`);

  return data;
};

const { data: bucket } = await storage.getBucket(BUCKET);

if (!bucket) {
  check(await storage.createBucket(BUCKET, { public: false }), "create bucket");
  console.log(`Created private bucket ${BUCKET}`);
} else if (bucket.public) {
  throw new Error(`Bucket ${BUCKET} is public; make it private first.`);
}

const entries = await readdir(ROOT, { withFileTypes: true });
let uploaded = 0;
let topics = 0;

for (const { name: slug } of entries.filter((entry) => entry.isDirectory())) {
  const folder = join(ROOT, slug);
  const manifests = (await readdir(folder)).filter((file) => file === "vi.json" || file === "en.json");
  const existing = new Set(
    check(await storage.from(BUCKET).list(slug, { limit: 1000 }), `list ${slug}`).map((file) => file.name)
  );
  const wanted = new Set(manifests);

  // Audio first, manifests last: a manifest must never name a missing file.
  for (const manifest of manifests) {
    const { sections } = JSON.parse(await readFile(join(folder, manifest), "utf8"));

    for (const { file } of Object.values(sections)) {
      wanted.add(file);

      if (existing.has(file)) continue;

      check(
        await storage.from(BUCKET).upload(`${slug}/${file}`, await readFile(join(folder, file)), {
          contentType: "audio/mp4",
          cacheControl: "31536000",
          upsert: true,
        }),
        `upload ${slug}/${file}`
      );
      uploaded += 1;
    }
  }

  for (const manifest of manifests) {
    check(
      await storage.from(BUCKET).upload(`${slug}/${manifest}`, await readFile(join(folder, manifest)), {
        contentType: "application/json",
        cacheControl: "0",
        upsert: true,
      }),
      `upload ${slug}/${manifest}`
    );
  }

  const stale = [...existing].filter((file) => !wanted.has(file)).map((file) => `${slug}/${file}`);

  if (stale.length > 0) {
    check(await storage.from(BUCKET).remove(stale), `remove stale files of ${slug}`);
  }

  topics += 1;
  console.log(`${slug}: ok`);
}

console.log(`Done: ${topics} topics, ${uploaded} audio files uploaded.`);
