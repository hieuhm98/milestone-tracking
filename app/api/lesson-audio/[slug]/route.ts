import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { getSupabaseAdmin, userFromRequest } from "@/lib/supabase/admin";
import { type LessonAudioData, type LessonAudioTrack } from "@/lib/lessonAudio";
import { type Lang } from "@/lib/i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/lesson-audio/<slug>
//
// The narration of one topic, per language. On a machine that has generated the
// files they are served from public/; otherwise they come from the private
// `lesson-audio` bucket as temporary links, for approved accounts only.

const BUCKET = "lesson-audio";
const LINK_SECONDS = 6 * 60 * 60;
const LANGS: Lang[] = ["vi", "en"];

interface Manifest {
  sections: Record<string, { file: string; seconds: number }>;
}

const toTracks = (manifest: Manifest, link: (file: string) => string | undefined): LessonAudioTrack[] =>
  Object.entries(manifest.sections).flatMap(([section, { file, seconds }]) => {
    const src = link(file);

    return src ? [{ section: Number(section), src, seconds }] : [];
  });

async function localAudio(slug: string): Promise<LessonAudioData | null> {
  const found: LessonAudioData = { vi: [], en: [] };

  for (const lang of LANGS) {
    try {
      const file = join(process.cwd(), "public", "lesson-audio", slug, `${lang}.json`);
      const manifest = JSON.parse(await readFile(file, "utf8")) as Manifest;

      found[lang] = toTracks(manifest, (name) => `/lesson-audio/${slug}/${name}`);
    } catch {
      // No local narration in this language.
    }
  }

  return found.vi.length > 0 || found.en.length > 0 ? found : null;
}

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const { slug } = params;
  const none: LessonAudioData = { vi: [], en: [] };

  if (!/^[a-z0-9-]+$/.test(slug)) return NextResponse.json(none, { status: 400 });

  const local = process.env.VERCEL ? null : await localAudio(slug);

  if (local) return NextResponse.json(local);

  const supabase = getSupabaseAdmin();

  if (!supabase) return NextResponse.json(none);

  const user = await userFromRequest(request);

  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).maybeSingle();

  if (profile?.status !== "active") return NextResponse.json({ error: "account_not_active" }, { status: 403 });

  const bucket = supabase.storage.from(BUCKET);
  const result: LessonAudioData = { vi: [], en: [] };

  await Promise.all(
    LANGS.map(async (lang) => {
      const { data } = await bucket.download(`${slug}/${lang}.json`);

      if (!data) return;

      const manifest = JSON.parse(await data.text()) as Manifest;
      const paths = Object.values(manifest.sections).map(({ file }) => `${slug}/${file}`);
      const { data: signed } = await bucket.createSignedUrls(paths, LINK_SECONDS);
      const links = new Map((signed ?? []).map((item) => [item.path, item.signedUrl || undefined]));

      result[lang] = toTracks(manifest, (file) => links.get(`${slug}/${file}`));
    })
  );

  return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
}
