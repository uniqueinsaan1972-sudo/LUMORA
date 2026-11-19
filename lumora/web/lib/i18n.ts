// Interface language only (separate from study language). Only languages with REVIEWED translations are enabled.
// Add Arabic/Hindi/Spanish/French/Chinese by supplying human-reviewed strings — do not ship machine placeholders.
export const LANGS = { en: { name: 'English', dir: 'ltr' }, ur: { name: 'اردو', dir: 'rtl' } } as const;
export type Lang = keyof typeof LANGS;
const dict: Record<Lang, Record<string, string>> = {
  en: { dashboard: 'Dashboard', notes: 'My Notes', questions: 'Important Questions', flashcards: 'Flashcards', quizzes: 'Quizzes & Tests', vocabulary: 'Vocabulary',
    planner: 'Study Planner', performance: 'Performance', friends: 'Friends & Challenges', comeback: 'Comeback Mode', profile: 'Profile', settings: 'Settings',
    classes: 'My Classes', createTest: 'Create Test', manageTests: 'Manage Tests', logout: 'Log out' },
  ur: { dashboard: 'ڈیش بورڈ', notes: 'میرے نوٹس', questions: 'اہم سوالات', flashcards: 'فلیش کارڈز', quizzes: 'کوئز اور ٹیسٹ', vocabulary: 'ذخیرہ الفاظ',
    planner: 'مطالعہ کا منصوبہ', performance: 'کارکردگی', friends: 'دوست اور چیلنج', comeback: 'واپسی موڈ', profile: 'پروفائل', settings: 'ترتیبات',
    classes: 'میری کلاسیں', createTest: 'ٹیسٹ بنائیں', manageTests: 'ٹیسٹ مینیج کریں', logout: 'لاگ آؤٹ' },
};
export const t = (lang: string, key: string) => (dict[(lang as Lang)] ?? dict.en)[key] ?? dict.en[key] ?? key;
export const dirOf = (lang: string) => (LANGS[lang as Lang]?.dir ?? 'ltr');
