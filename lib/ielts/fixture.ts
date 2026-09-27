// Hand-written stand-in for the extracted data, so the UI can be built and
// reviewed before the PDF pipeline exists: ONE Part 1 topic with two questions
// and ONE cue card with a single Part 3 follow-up.
//
// The answers, analysis and vocabulary below are written for this fixture, in
// the voice the real material uses (a Grade 11 student in Cầu Giấy, Hà Nội).
// They are replaced wholesale by data/ielts-speaking/*.json — nothing here is
// referenced outside lib/ielts/data.ts.
//
// `Segment.vocabIndex` is a 0-based index into the unit's `vocabulary` array.

import type { CueCard, Intro, Part1Topic, Toc } from "./types";

export const FIXTURE_TOC: Toc = {
  part1: [
    {
      slug: "topic-1-computers-tablets",
      group: "Topics 1–10",
      label: "Topic 1",
      title: "Computers / Tablets",
      titleVi: "Máy tính / Máy tính bảng",
      questions: [
        { id: "p1-q18", label: "18" },
        { id: "p1-q19", label: "19" },
      ],
    },
  ],
  part23: [
    {
      slug: "card-1",
      group: "Cards 1–10",
      label: "Card 1",
      title: "A person you met once and want to know more about",
      titleVi: "Người bạn gặp một lần gần đây và muốn biết thêm",
      questions: [
        { id: "c1-part2", label: "Part 2" },
        { id: "c1-p3-1", label: "Part 3 · 1" },
      ],
    },
  ],
  // The totals of the full source, shown on the home page even while only the
  // fixture is wired up.
  stats: { part1: 212, cards: 66, part3: 283, phrases: 2440 },
};

export const FIXTURE_INTRO: Intro = {
  howToUse: {
    title: "How to use this page",
    titleVi: "Cách sử dụng tài liệu",
    paragraphs: [
      "Every question from the September–December 2026 forecast is answered twice, from the point of view of a Grade 11 student living in Cầu Giấy, Hà Nội. The Band 6 answer is relevant and mostly accurate, but plain. The Band 9 answer is what a fluent, natural speaker would say: direct, specific and personal. The same “speaker” appears throughout this page (family, friends, hobbies, plans), so Part 1 answers, Part 2 talks and Part 3 opinions fit together like a real candidate's.",
      "Phrases worth learning are highlighted in each Band 9 answer and explained in the table below it (definition, a new example sentence, Vietnamese meaning). A three-row table compares Band 6 and Band 9 on Fluency & Coherence, Lexical Resource and Grammar, and the “Key difference” line sums it up. Words that Vietnamese learners often mispronounce carry their British IPA in small grey type underneath (ˈ = main stress).",
      "Do not memorise the answers word for word: examiners notice. Learn the highlighted language, then answer the question again with your own real details.",
      "Part 1 “Work”: the Work questions are for candidates who have a job; as a high-school student, you answer the Study branch. Part 2 & 3: where the source forecast repeated, mismatched or omitted questions or bullet points, this is noted in the relevant card.",
    ],
  },
  navigate: {
    title: "How to navigate this page",
    titleVi: "Cách di chuyển trong trang này",
    en: [
      "**Contents panel:** the panel on the left (the **Contents** button on phones) shows everything as a tree: Part → topic or card → every question. Your current question is marked.",
      "**Top bar:** tap **Contents**, **Part 1** or **Part 2 & 3** to jump there. The path on the right takes you back to the group or section you are reading.",
      "**Inside a question:** the pills **Band 6 · Band 9 · Analysis · Vocabulary** jump within the question; **Previous / Next** move to the neighbouring question, across topics and cards.",
      "**After each question:** “↑ Back to section list” returns to the topic or card list; “↑ Main contents” returns to the main contents.",
      "**Highlighted phrases:** tap one to see its Vietnamese meaning and jump to its row in the Vocabulary table.",
      "**Reader settings:** turn IPA or Band 6 on and off, change text size, or switch on Practice mode to answer before you see Band 9.",
    ],
    vi: [
      "**Mục lục:** khung bên trái (nút **Mục lục** trên điện thoại) hiển thị toàn bộ nội dung dạng cây: Part → topic hoặc card → từng câu hỏi. Câu bạn đang đọc được đánh dấu.",
      "**Thanh trên cùng:** bấm **Mục lục**, **Part 1** hoặc **Part 2 & 3** để chuyển tới đó. Đường dẫn bên phải đưa bạn về nhóm hoặc mục đang đọc.",
      "**Trong mỗi câu hỏi:** các nút **Band 6 · Band 9 · Phân tích · Từ vựng** để nhảy nhanh trong câu; **Câu trước / Câu sau** để sang câu bên cạnh, nối liền qua các topic và card.",
      "**Cuối mỗi câu hỏi:** “↑ Về danh sách câu hỏi” quay lại danh sách của topic/card; “↑ Mục lục chính” quay về mục lục chính.",
      "**Cụm từ được tô màu:** chạm vào để xem nghĩa tiếng Việt và nhảy tới dòng tương ứng trong bảng Vocabulary.",
      "**Tuỳ chỉnh hiển thị:** bật/tắt IPA hoặc Band 6, đổi cỡ chữ, hoặc bật Chế độ tự luyện để tự trả lời trước khi xem Band 9.",
    ],
  },
  criteria: {
    title: "Band 6 vs Band 9: what the examiner hears",
    titleVi: "Band 6 và Band 9 khác nhau ở đâu",
    rows: [
      {
        name: "Fluency & Coherence",
        nameVi: "Trôi chảy & mạch lạc",
        band6:
          "Willing to talk, but answers are short or loosely connected. Uses common linkers (and, but, because, also), sometimes mechanically. Ideas are listed rather than developed.",
        band9:
          "Speaks easily with no effort to find words. Every idea grows out of the one before: answer, then reason, example, contrast or comment. Linking is natural and varied.",
      },
      {
        name: "Lexical Resource",
        nameVi: "Vốn từ vựng",
        band6:
          "Enough vocabulary for the topic, but mostly general words (good, bad, big, nice, interesting). Some unnatural choices or translations from Vietnamese.",
        band9:
          "Precise, natural vocabulary: idioms, phrasal verbs and collocations used correctly and in the right tone.",
      },
      {
        name: "Grammatical Range & Accuracy",
        nameVi: "Ngữ pháp",
        band6:
          "A mix of simple and some complex sentences, but little variety. Frequent small errors, though meaning is usually clear.",
        band9:
          "A full range of structures used naturally: relative clauses, conditionals, perfect tenses, passives, participle clauses, cleft sentences. Errors are extremely rare.",
      },
      {
        name: "Pronunciation",
        nameVi: "Phát âm",
        band6:
          "Generally clear, but flat intonation, word-by-word delivery and some mispronounced sounds.",
        band9:
          "Effortless to understand: speaks in chunks, stresses key words, and uses intonation to show attitude.",
      },
    ],
  },
  movesPart1: {
    title: "Five moves that lift a Part 1 answer from Band 6 to Band 9",
    steps: [
      {
        label: "Answer, then extend.",
        text: "Give the direct answer first, then add a reason, a real example, a contrast or a feeling.",
      },
      {
        label: "Be specific.",
        text: "Replace “a big city”, “many things”, “very bad” with real names, numbers and details.",
      },
      {
        label: "Swap general words for natural phrases.",
        text: "“very bad” → “leaves a lot to be desired”; “relax” → “unwind”.",
      },
      {
        label: "Use a range of structures naturally.",
        text: "Present perfect, conditionals, relative clauses, “so… that”, carrying real information.",
      },
      {
        label: "Sound like a person, not a textbook.",
        text: "Hedge (probably, I'd say), show attitude (honestly, funnily enough), allow a little humour.",
      },
    ],
  },
  movesPart23: {
    title: "Five moves that lift a Part 2 talk and Part 3 answers to Band 9",
    titleVi: "Chiến lược Part 2 & 3",
    steps: [
      {
        label: "Use the minute to plan, not to write sentences.",
        text: "Jot four or five keywords, one for each bullet on the card, plus one “story detail” you can describe vividly.",
      },
      {
        label: "Tell it like a story.",
        text: "Set the scene (when, where), say what happened in order, then reflect on it. Band 6 talks usually list answers to the bullets one by one.",
      },
      {
        label: "Keep going for the full two minutes.",
        text: "Band 9 speakers extend with detail, direct speech and feelings. If you run out, add what you would do differently or what you learned.",
      },
      {
        label: "In Part 3, move from personal to general.",
        text: "The examiner wants ideas about people and society. Give a view, a reason, an example, and a qualification (“That said…”, “It depends on…”).",
      },
      {
        label: "Use abstract, precise vocabulary in Part 3.",
        text: "Words like “intrusive”, “well-meaning”, “reliability” show you can discuss ideas, not just your own life.",
      },
    ],
    tip: {
      label: "Pronunciation tips",
      text: "In Part 2, vary your speed and pitch like a storyteller; slow down for the most important detail. In Part 3, stress the key contrast words (but, whereas, however).",
    },
  },
};

export const FIXTURE_PART1: Part1Topic[] = [
  {
    slug: "topic-1-computers-tablets",
    group: "Topics 1–10",
    label: "Topic 1",
    title: "Computers / Tablets",
    titleVi: "Máy tính / Máy tính bảng",
    range: [18, 19],
    questions: [
      {
        id: "p1-q18",
        kind: "part1",
        number: 18,
        question: "Do you often use a computer?",
        band6: {
          words: 24,
          segments: [
            {
              t: "text",
              v: "Yes, I use a computer almost every day. I use it for my homework and sometimes for games. It is quite useful for me.",
            },
          ],
        },
        band9: {
          words: 62,
          phrases: 3,
          segments: [
            { t: "text", v: "Pretty much every day, yes — it's the one thing my school life runs on. I'm on my laptop for at least two " },
            { t: "ipa", v: "hours", ipa: "ˈaʊəz" },
            { t: "text", v: " a night, usually writing up " },
            { t: "ipa", v: "Informatics", ipa: "ˌɪnfəˈmætɪks" },
            { t: "text", v: " assignments or " },
            { t: "phrase", v: "digging through", vocabIndex: 0 },
            { t: "text", v: " past papers for my IELTS practice. Honestly, " },
            { t: "phrase", v: "I'd be lost without it", vocabIndex: 1 },
            {
              t: "text",
              v: " — our whole class shares notes in one Drive folder, so if my laptop died for a week I'd be completely ",
            },
            { t: "phrase", v: "out of the loop", vocabIndex: 2 },
            { t: "text", v: "." },
          ],
        },
        analysis: {
          fluency: {
            band6:
              "Answers the question and adds two uses, but each sentence stands alone; the ideas are listed rather than developed.",
            band9:
              "Answers in three words, then grows the answer outwards: how long, what for, and what would happen without it.",
          },
          lexical: {
            band6: "General, safe words: use, homework, games, quite useful. Nothing an examiner would mark as natural.",
            band9:
              "Natural chunks a fluent speaker reaches for: pretty much, writing up, digging through, out of the loop.",
          },
          grammar: {
            band6: "Three short present-simple sentences; no subordination and no time reference beyond “every day”.",
            band9:
              "Present continuous for the habit, a second conditional (“if my laptop died… I'd be”), and a participle clause after “usually”.",
          },
          keyDifference:
            "Band 6 names the activity; Band 9 makes it concrete — a number of hours, a named subject, and a consequence — so the examiner hears a real life, not a topic.",
        },
        vocabulary: [
          {
            term: "dig through (something)",
            definition: "to search through a large amount of material to find what you need",
            example: "I dug through three years of past papers before I found that question type.",
            vietnamese: "lục tìm, đào trong (tài liệu, đống đồ)",
          },
          {
            term: "be lost without something",
            definition: "to be unable to manage if you did not have it",
            example: "I'd be lost without the shared calendar my class keeps.",
            vietnamese: "không thể sống thiếu, không biết làm sao nếu không có",
          },
          {
            term: "be out of the loop",
            definition: "to stop receiving the information that a group shares",
            example: "I missed one week of school and felt completely out of the loop.",
            vietnamese: "không nắm được thông tin, bị lạc khỏi nhóm",
          },
        ],
      },
      {
        id: "p1-q19",
        kind: "part1",
        number: 19,
        question: "Do you prefer a computer or a tablet?",
        band6: {
          words: 27,
          segments: [
            {
              t: "text",
              v: "I prefer a computer because it is bigger and faster. A tablet is good for watching videos, but typing on it is not very easy for me.",
            },
          ],
        },
        band9: {
          words: 58,
          phrases: 2,
          segments: [
            { t: "text", v: "A laptop, without a doubt. A tablet is fine for reading on the bus, but the moment I have to type an essay it " },
            { t: "phrase", v: "leaves a lot to be desired", vocabIndex: 0 },
            { t: "text", v: " — the on-screen " },
            { t: "ipa", v: "keyboard", ipa: "ˈkiːbɔːd" },
            { t: "text", v: " swallows half the screen. So the tablet has basically " },
            { t: "phrase", v: "ended up", vocabIndex: 1 },
            { t: "text", v: " as my little sister's cartoon machine, and I keep the laptop." },
          ],
        },
        analysis: {
          fluency: {
            band6: "Makes a choice and gives one reason each way, but the contrast is mechanical: “because… but…”.",
            band9:
              "Chooses in three words, concedes what the tablet is good for, then closes with a small joke that rounds the answer off.",
          },
          lexical: {
            band6: "Comparatives built from the plainest adjectives available: bigger, faster, good, not very easy.",
            band9: "Evaluative language with a bit of colour: without a doubt, leaves a lot to be desired, ended up as.",
          },
          grammar: {
            band6: "Two coordinated sentences; the gerund subject (“typing on it”) is the only complex element.",
            band9:
              "A “the moment…” time clause, a present perfect result, and a possessive noun phrase carrying real information.",
          },
          keyDifference:
            "Both answers pick the laptop, but Band 9 explains the choice through one vivid detail — the keyboard eating the screen — instead of a general adjective.",
          note: "Note: Q20 in the source repeats this comparison from the tablet's point of view.",
        },
        vocabulary: [
          {
            term: "leave a lot to be desired",
            definition: "to be much worse than you would want or expect",
            example: "The wifi at my school leaves a lot to be desired.",
            vietnamese: "còn nhiều điều đáng phàn nàn, còn kém xa mong đợi",
          },
          {
            term: "end up (as / doing something)",
            definition: "to reach a situation or role that you did not plan",
            example: "The old phone ended up as my alarm clock.",
            vietnamese: "cuối cùng lại thành, rốt cuộc trở thành",
          },
        ],
      },
    ],
  },
];

export const FIXTURE_CARDS: CueCard[] = [
  {
    number: 1,
    slug: "card-1",
    group: "Cards 1–10",
    title: "A person you met once and want to know more about",
    titleVi: "Người bạn gặp một lần gần đây và muốn biết thêm",
    prompt: "Describe a person you met once and want to know more about.",
    bullets: [
      "who this person is",
      "when and where you met them",
      "what you talked about",
      "and explain why you want to know more about them",
    ],
    notes: [
      { label: "Who", text: "Mr Khoa — coffee roaster, mid-thirties, Nghĩa Tân market" },
      { label: "When / where", text: "Last Sunday, 7 a.m., queue at his little roastery" },
      { label: "What we talked about", text: "Beans from Cầu Đất, why he weighs everything, his old office job" },
      { label: "Why I want to know more", text: "He left accounting for this — I want to know how you dare do that" },
    ],
    part2: {
      id: "c1-part2",
      kind: "part2",
      number: 2,
      question: "Describe a person you met once and want to know more about.",
      band6: {
        words: 96,
        segments: [
          {
            t: "text",
            v: "I want to talk about a man called Mr Khoa. He sells coffee near my house in Cầu Giấy. I met him last Sunday morning when I bought coffee for my father. He is about thirty-five years old and he is quite friendly. We talked about his coffee beans. He said the beans come from Đà Lạt and he roasts them himself every week. He also told me that he worked in an office before, but he did not like it, so he opened this small shop. I want to know more about him because his story is interesting and I think he is brave.",
          },
        ],
      },
      band9: {
        words: 214,
        phrases: 3,
        segments: [
          {
            t: "text",
            v: "The person I'd like to talk about is a coffee roaster near my house — everyone in the neighbourhood just calls him Mr Khoa. He can't be much older than thirty-five, and he runs a roastery the size of a garage on the edge of Nghĩa Tân market.\n\nI met him properly only once, last Sunday at about seven in the morning. My father had sent me out for beans, and because the machine was still warming up I ended up standing in his doorway for a good twenty minutes, watching him weigh everything to the gram. He talked me through the whole ",
          },
          { t: "ipa", v: "process", ipa: "ˈprəʊsɛs" },
          {
            t: "text",
            v: ": where the beans come from, why the ones from Cầu Đất taste sweeter, how he can tell by the sound of the cracking when to stop. I barely said a word — I was completely ",
          },
          { t: "phrase", v: "hooked on", vocabIndex: 0 },
          {
            t: "text",
            v: " the way he described it.\n\nThe thing that stayed with me came at the end. He mentioned, almost in passing, that he had spent nine years as an accountant before he ",
          },
          { t: "phrase", v: "jacked it in", vocabIndex: 1 },
          {
            t: "text",
            v: " to do this. That's what I want to know more about: not the coffee, but how somebody finds the nerve to ",
          },
          { t: "phrase", v: "start from scratch", vocabIndex: 2 },
          {
            t: "text",
            v: " in their thirties. If I ever get up that early again, I'm going to ask him.",
          },
        ],
      },
      analysis: {
        fluency: {
          band6:
            "Covers all four bullets in order, one or two sentences each, so the talk reads as a checklist and would run out well before two minutes.",
          band9:
            "Told as a story: the scene is set, the conversation unfolds in order, and the last paragraph turns the anecdote into the reason for the answer.",
        },
        lexical: {
          band6: "Topic words are present (roast, beans, office, brave) but the evaluation stays at “interesting”.",
          band9:
            "Specific and idiomatic: the size of a garage, weigh everything to the gram, hooked on, jacked it in, find the nerve.",
        },
        grammar: {
          band6: "Mostly simple past with “and / but / so”; one reported clause (“he said the beans come from…”).",
          band9:
            "Past perfect for the back-story, a “because…” clause inside a longer sentence, a cleft (“That's what I want to know”), and a first conditional to close.",
        },
        keyDifference:
          "Band 6 answers the bullets; Band 9 uses them as a frame for one remembered scene, which is why it can keep going for two minutes without repeating itself.",
      },
      vocabulary: [
        {
          term: "be hooked on something",
          definition: "to be so interested in something that you cannot stop paying attention to it",
          example: "I listened to one episode and I was hooked on the whole series.",
          vietnamese: "bị cuốn hút, say mê đến mức không dứt ra được",
        },
        {
          term: "jack something in",
          definition: "to give up a job or activity, especially suddenly (informal)",
          example: "She jacked in a well-paid job to train as a teacher.",
          vietnamese: "bỏ ngang (công việc), dẹp luôn",
        },
        {
          term: "start from scratch",
          definition: "to begin again from nothing, without using anything you had before",
          example: "My file was corrupted, so I had to start from scratch.",
          vietnamese: "bắt đầu lại từ đầu, từ con số không",
        },
      ],
    },
    part3: [
      {
        id: "c1-p3-1",
        kind: "part3",
        number: 1,
        question: "Why are people curious about the lives of strangers?",
        band6: {
          words: 41,
          segments: [
            {
              t: "text",
              v: "I think people are curious because they want to compare their life with other people's lives. Social media also makes it easy to see what strangers are doing, so people become more curious than before.",
            },
          ],
        },
        band9: {
          words: 79,
          phrases: 2,
          segments: [
            {
              t: "text",
              v: "Partly because a stranger's life is a shortcut to an experience we'll never have ourselves — you get the ending without any of the risk. There's also a more ordinary reason: most of us are quietly checking whether we're on the right track, and other people are the only ",
            },
            { t: "phrase", v: "yardstick", vocabIndex: 0 },
            {
              t: "text",
              v: " we've got. That said, I'd draw a line between that kind of curiosity and the ",
            },
            { t: "phrase", v: "intrusive", vocabIndex: 1 },
            { t: "text", v: " sort, where knowing becomes a form of ownership." },
          ],
        },
        analysis: {
          fluency: {
            band6: "Two reasons, both stated and then dropped; nothing is qualified or weighed against anything else.",
            band9:
              "Two reasons ranked (“partly… there's also a more ordinary reason”), then a qualification that limits the claim — the Part 3 shape the examiner is listening for.",
          },
          lexical: {
            band6: "Abstract ideas expressed with the most general words available: curious, compare, easy to see.",
            band9: "Discussion vocabulary: a shortcut to an experience, on the right track, yardstick, intrusive, a form of ownership.",
          },
          grammar: {
            band6: "Two sentences joined with “because” and “so”; no hedging and no contrast structure.",
            band9:
              "A relative clause, a reduced clause after “where”, and hedged modality (“I'd draw a line…”) that signals opinion rather than fact.",
          },
          keyDifference:
            "Band 6 gives causes; Band 9 gives a position — ranked reasons plus a limit on how far the argument goes.",
          note: "Note: this card's Part 3 questions overlap with Card 5 in the source forecast.",
        },
        vocabulary: [
          {
            term: "a yardstick",
            definition: "a standard you use to judge how good or successful something is",
            example: "Exam scores are a poor yardstick for curiosity.",
            vietnamese: "thước đo, chuẩn để so sánh",
          },
          {
            term: "intrusive",
            definition: "going further into someone's private life than is welcome",
            example: "The questions felt intrusive, so I changed the subject.",
            vietnamese: "xâm phạm, tò mò quá mức vào chuyện riêng tư",
          },
        ],
      },
    ],
  },
];
