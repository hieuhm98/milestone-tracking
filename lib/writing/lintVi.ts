// Harper only writes English. These give each of its categories a Vietnamese
// name and a one-line explanation, shown alongside the original message.

const KINDS: Record<string, [name: string, explanation: string]> = {
  Agreement: ["Hoà hợp", "Chủ ngữ, động từ hoặc số ít/số nhiều chưa khớp nhau."],
  BoundaryError: ["Tách/ghép từ", "Từ bị viết liền hoặc tách rời sai."],
  Capitalization: ["Viết hoa", "Kiểm tra lại chữ hoa, chữ thường."],
  Eggcorn: ["Nhầm cụm từ", "Cụm từ bị viết theo cách nghe nhầm."],
  Enhancement: ["Gợi ý cải thiện", "Có cách diễn đạt tốt hơn."],
  Formatting: ["Định dạng", "Kiểm tra khoảng trắng và cách trình bày."],
  Grammar: ["Ngữ pháp", "Cấu trúc ngữ pháp chưa đúng."],
  Malapropism: ["Dùng nhầm từ", "Từ này dễ bị nhầm với một từ có âm gần giống."],
  Miscellaneous: ["Lỗi khác", "Đoạn này cần được xem lại."],
  Nonstandard: ["Không chuẩn", "Cách viết này không phải tiếng Anh chuẩn."],
  Punctuation: ["Dấu câu", "Dấu câu chưa đúng."],
  Readability: ["Dễ đọc", "Câu này khó đọc, nên viết gọn hoặc tách câu."],
  Redundancy: ["Thừa từ", "Có từ thừa, nên bỏ bớt."],
  Regionalism: ["Từ địa phương", "Cách dùng này thuộc một biến thể tiếng Anh khác."],
  Repetition: ["Lặp từ", "Một từ bị lặp lại."],
  Spelling: ["Chính tả", "Từ này có thể bị viết sai chính tả."],
  Style: ["Văn phong", "Cách viết chưa phù hợp văn phong."],
  Typo: ["Lỗi gõ", "Có vẻ là lỗi đánh máy."],
  Usage: ["Cách dùng", "Cách dùng từ hoặc cụm từ chưa đúng."],
  WordChoice: ["Chọn từ", "Nên chọn từ khác cho đúng nghĩa."],
};

export function lintInVietnamese(kind: string): { name: string; explanation: string } {
  const [name, explanation] = KINDS[kind] ?? KINDS.Miscellaneous;

  return { name, explanation };
}
