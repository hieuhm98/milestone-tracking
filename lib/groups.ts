// Content groups. Each knowledge topic belongs to a group via its meta.json
// `group` field. Groups are rendered as sections on the Knowledge page and can
// be used to scope the Daily Quick Test.
//
// The original `ba-po-pm` group mixed foundational IT knowledge with the three
// business roles, which made the track hard to navigate once it passed ~30
// topics. It is now split four ways: shared IT groundwork, then one track per
// role. Topics that are genuinely cross-role (Agile, Scrum, the SDLC models)
// live in `it-fundamentals`, with role-specific spin-offs in each role track.

export interface Group {
  id: string;
  order: number;
  label: string; // Vietnamese
  labelEn: string; // English
  description: string;
  descriptionEn: string;
  icon: string;
  /** Tailwind color name used for accents (must exist in the safelist below). */
  accent: "blue" | "emerald" | "amber" | "rose" | "violet" | "orange" | "cyan" | "indigo";
}

export const GROUPS: Group[] = [
  {
    id: "it-fundamentals",
    order: 1,
    label: "Nền tảng IT",
    labelEn: "IT Fundamentals",
    description:
      "Kiến thức kỹ thuật nền tảng mà mọi vai trò BA, PO, PM đều cần: mạng, web, API, dữ liệu, kiến trúc và quy trình phát triển — kết thúc bằng phần thực hành tự xây một website To-do có đăng nhập (React, Express, SQL) và kiểm thử bằng Chrome DevTools.",
    descriptionEn:
      "The technical groundwork every BA, PO, and PM needs: networking, the web, APIs, data, architecture, and the development process — ending with a hands-on build of a to-do website with login (React, Express, SQL), tested with Chrome DevTools.",
    icon: "◉",
    accent: "blue",
  },
  {
    id: "ba",
    order: 2,
    label: "Business Analyst",
    labelEn: "Business Analyst",
    description:
      "Nghề BA từ định hướng nghề nghiệp tới kỹ thuật cốt lõi: khơi gợi yêu cầu, đặc tả, mô hình hoá, tài liệu và công cụ.",
    descriptionEn:
      "The BA craft from career orientation to core technique: elicitation, specification, modeling, documentation, and tooling.",
    icon: "◈",
    accent: "emerald",
  },
  {
    id: "po",
    order: 3,
    label: "Product Owner",
    labelEn: "Product Owner",
    description:
      "Vai trò Product Owner: tầm nhìn sản phẩm, backlog, ưu tiên hoá, khám phá và đo lường giá trị.",
    descriptionEn:
      "The Product Owner role: product vision, backlog, prioritization, discovery, and measuring value.",
    icon: "◐",
    accent: "amber",
  },
  {
    id: "pm",
    order: 4,
    label: "Project Manager",
    labelEn: "Project Manager",
    description:
      "Vai trò Project Manager: vòng đời dự án, lập kế hoạch, ước tính, phạm vi, rủi ro, đội ngũ và giao tiếp.",
    descriptionEn:
      "The Project Manager role: project life cycle, planning, estimation, scope, risk, teams, and communication.",
    icon: "◇",
    accent: "rose",
  },
  {
    id: "req",
    order: 5,
    label: "Software Requirements",
    labelEn: "Software Requirements",
    description:
      "Khoá kỹ nghệ yêu cầu dựa trên sách Software Requirements, 3rd Edition (Karl Wiegers & Joy Beatty).",
    descriptionEn:
      "Requirements-engineering track based on Software Requirements, 3rd Edition (Karl Wiegers & Joy Beatty).",
    icon: "◆",
    accent: "violet",
  },
  {
    id: "dev",
    order: 6,
    label: "Developer · AWS",
    labelEn: "Developer · AWS",
    description: "Lộ trình AWS Certified Solutions Architect – Associate (SAA-C03).",
    descriptionEn: "AWS Certified Solutions Architect – Associate (SAA-C03) learning track.",
    icon: "☁",
    accent: "orange",
  },
  {
    id: "dsa",
    order: 7,
    label: "Cấu trúc dữ liệu & Giải thuật",
    labelEn: "Data Structures & Algorithms",
    description:
      "Big O, các mẫu giải bài, đệ quy, tìm kiếm & sắp xếp, linked list, cây, heap, hash table, đồ thị và quy hoạch động — bằng JavaScript.",
    descriptionEn:
      "Big O, problem-solving patterns, recursion, searching & sorting, linked lists, trees, heaps, hash tables, graphs, and dynamic programming — in JavaScript.",
    icon: "⌬",
    accent: "cyan",
  },
  {
    id: "sa",
    order: 8,
    label: "Solutions Architect · DevOps",
    labelEn: "Solutions Architect · DevOps",
    description:
      "Lộ trình Solutions Architect: Linux, mạng, Docker, Kubernetes, nginx, Redis, message queue, CI/CD, IaC, observability, bảo mật, microservices và system design.",
    descriptionEn:
      "The Solutions Architect path: Linux, networking, Docker, Kubernetes, nginx, Redis, message queues, CI/CD, IaC, observability, security, microservices, and system design.",
    icon: "⛭",
    accent: "indigo",
  },
];

export const DEFAULT_GROUP = "it-fundamentals";

export function getGroup(id: string | undefined): Group | undefined {
  return GROUPS.find((g) => g.id === id);
}

// Accent class maps (kept explicit so Tailwind's JIT keeps these classes).
export const GROUP_ACCENT: Record<Group["accent"], { badge: string; bar: string; text: string }> = {
  blue: {
    badge: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    bar: "bg-blue-500",
    text: "text-blue-600 dark:text-blue-400",
  },
  emerald: {
    badge:
      "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    bar: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  amber: {
    badge:
      "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    bar: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
  },
  rose: {
    badge: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    bar: "bg-rose-500",
    text: "text-rose-600 dark:text-rose-400",
  },
  violet: {
    badge:
      "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800",
    bar: "bg-violet-500",
    text: "text-violet-600 dark:text-violet-400",
  },
  orange: {
    badge: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
    bar: "bg-orange-500",
    text: "text-orange-600 dark:text-orange-400",
  },
  cyan: {
    badge: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
    bar: "bg-cyan-500",
    text: "text-cyan-600 dark:text-cyan-400",
  },
  indigo: {
    badge:
      "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    bar: "bg-indigo-500",
    text: "text-indigo-600 dark:text-indigo-400",
  },
};

// Course cover art for the study-path cards: a gradient per accent. Literal
// strings for the same JIT reason as GROUP_ACCENT.
export const GROUP_COVER: Record<Group["accent"], string> = {
  blue: "from-blue-500 via-blue-600 to-sky-700",
  emerald: "from-emerald-500 via-emerald-600 to-teal-700",
  amber: "from-amber-400 via-amber-500 to-orange-600",
  rose: "from-rose-500 via-rose-600 to-pink-700",
  violet: "from-violet-500 via-violet-600 to-purple-700",
  orange: "from-orange-500 via-orange-600 to-red-600",
  cyan: "from-cyan-500 via-cyan-600 to-blue-700",
  indigo: "from-indigo-500 via-indigo-600 to-violet-700",
};
