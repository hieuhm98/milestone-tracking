import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { DEFAULT_GROUP } from "@/lib/groups";

const CONTENT_DIR = path.join(process.cwd(), "knowledge-content");

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    const dir = path.join(CONTENT_DIR, params.slug);
    const articlePath = path.join(dir, "article.md");
    const articleEnPath = path.join(dir, "article.en.md");
    const questionsPath = path.join(dir, "questions.json");
    const lessonsPath = path.join(dir, "lessons.json");
    const vocabPath = path.join(dir, "vocab.json");
    const metaPath = path.join(dir, "meta.json");

    if (!fs.existsSync(articlePath)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const content = fs.readFileSync(articlePath, "utf-8");
    const contentEn = fs.existsSync(articleEnPath)
      ? fs.readFileSync(articleEnPath, "utf-8")
      : null;
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    const questions = fs.existsSync(questionsPath)
      ? JSON.parse(fs.readFileSync(questionsPath, "utf-8"))
      : [];
    // Mini-lesson breakdown — absent for topics that haven't been split yet.
    const lessons = fs.existsSync(lessonsPath)
      ? JSON.parse(fs.readFileSync(lessonsPath, "utf-8")).lessons ?? []
      : [];

    // English vocabulary is opt-in (`?vocab=1`). Only the lesson player needs
    // it, and the exam and Daily Quick Test fetch every topic in a track — at
    // ~60 KB a topic, sending it unasked would bloat those draws for nothing.
    const wantVocab = new URL(req.url).searchParams.get("vocab") === "1";
    const vocab =
      wantVocab && fs.existsSync(vocabPath)
        ? JSON.parse(fs.readFileSync(vocabPath, "utf-8")).items ?? []
        : [];

    return NextResponse.json({
      slug: params.slug,
      group: meta.group ?? DEFAULT_GROUP,
      content,
      contentEn,
      questions,
      lessons,
      ...(wantVocab ? { vocab } : {}),
      ...meta,
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
