import type { Metadata } from "next";
import WritingTest from "@/components/writing/WritingTest";

export const metadata: Metadata = { title: "IELTS Writing mock test" };

export default function WritingTestPage() {
  return <WritingTest />;
}
