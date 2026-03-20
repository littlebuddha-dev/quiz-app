import type { Locale } from '@/app/types';

type CurriculumSourceLevel = 'elementary' | 'juniorHigh' | 'highSchool';

export type CurriculumSubject = {
  id: string;
  label: string;
  aliases: string[];
  officialFocus: string;
  required: boolean;
  strands: string[];
};

export type CurriculumCourse = {
  id: string;
  label: string;
  ageMin: number;
  ageMax: number;
  overview: string;
  sourceLevel: CurriculumSourceLevel;
  subjects: CurriculumSubject[];
};

export type CategoryLike = {
  id: string;
  name?: string | null;
  nameJa?: string | null;
  nameEn?: string | null;
  nameZh?: string | null;
  ja?: string | null;
  en?: string | null;
  zh?: string | null;
};

export type QuizLike = {
  id: string;
  categoryId: string;
  targetAge: number;
};

export type HistoryLike = {
  quizId: string;
  isCorrect: boolean;
  createdAt: Date;
};

export type CourseSubjectProgress = {
  subject: CurriculumSubject;
  categoryIds: string[];
  availableQuizCount: number;
  solvedQuizCount: number;
  progress: number;
};

export type CourseProgress = {
  course: CurriculumCourse;
  progress: number;
  totalAvailableQuizCount: number;
  totalSolvedQuizCount: number;
  subjects: CourseSubjectProgress[];
};

export type AbilityDomain = {
  id: string;
  label: string;
  aliases: string[];
  description: string;
};

export type AbilityDomainScore = {
  domain: AbilityDomain;
  totalAttempts: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
};

export const CURRICULUM_SOURCE_LINKS: Record<CurriculumSourceLevel, string> = {
  elementary: 'https://www.mext.go.jp/a_menu/shotou/new-cs/youryou/syo/',
  juniorHigh: 'https://www.mext.go.jp/a_menu/shotou/new-cs/youryou/chu/',
  highSchool: 'https://www.mext.go.jp/a_menu/shotou/zyouhou/detail/mext_01831.html',
};

export const CURRICULUM_SOURCE_LABELS: Record<CurriculumSourceLevel, string> = {
  elementary: '文部科学省 小学校学習指導要領',
  juniorHigh: '文部科学省 中学校学習指導要領',
  highSchool: '文部科学省 高等学校学習指導要領関連資料',
};

const CURRICULUM_SOURCE_LABELS_I18N: Record<Locale, Record<CurriculumSourceLevel, string>> = {
  ja: CURRICULUM_SOURCE_LABELS,
  en: {
    elementary: 'MEXT Elementary School Course of Study',
    juniorHigh: 'MEXT Junior High School Course of Study',
    highSchool: 'MEXT High School Curriculum Materials',
  },
  zh: {
    elementary: '日本文部科学省 小学学习指导要领',
    juniorHigh: '日本文部科学省 初中学习指导要领',
    highSchool: '日本文部科学省 高中课程相关资料',
  },
};

export const CURRICULUM_COURSES: CurriculumCourse[] = [
  {
    id: 'elementary-1-2',
    label: '小学1-2年コース',
    ageMin: 6,
    ageMax: 7,
    overview: 'ことばの基礎、数の感覚、身近な生活理解を中心に、学びの土台を固めるコースです。',
    sourceLevel: 'elementary',
    subjects: [
      {
        id: 'japanese-foundation',
        label: '国語の基礎',
        aliases: ['国語', '日本語'],
        officialFocus: '話す・聞く・書く・読むの基本を身に付け、順序立てて表現する力を育てます。',
        required: true,
        strands: ['ひらがな・カタカナ', '文の順序', '身近な説明文', '音読と読解の基礎'],
      },
      {
        id: 'math-foundation',
        label: '算数の基礎',
        aliases: ['算数', '数学'],
        officialFocus: '数える、比べる、たし算・ひき算の考え方を通して数量感覚を育てます。',
        required: true,
        strands: ['数と計算', '長さ・かさ', '時刻', '図形の基礎'],
      },
      {
        id: 'life-studies',
        label: '生活・身の回り',
        aliases: ['理科', '社会'],
        officialFocus: '身近な自然や生活の気付きから学ぶ姿勢を育てます。',
        required: true,
        strands: ['季節と自然', 'くらしの約束', '地域の身近な仕事', '観察の習慣'],
      },
    ],
  },
  {
    id: 'elementary-3-4',
    label: '小学3-4年コース',
    ageMin: 8,
    ageMax: 9,
    overview: '国語・算数に加え、社会と理科が本格的に始まる時期の基礎コースです。',
    sourceLevel: 'elementary',
    subjects: [
      {
        id: 'japanese-elementary-mid',
        label: '国語',
        aliases: ['国語', '日本語'],
        officialFocus: '要点をつかんで読む、考えを段落で書く、相手に伝わる話し方を育てます。',
        required: true,
        strands: ['説明文の要点', '物語の読み取り', '段落構成', '話し合いの基本'],
      },
      {
        id: 'math-elementary-mid',
        label: '算数',
        aliases: ['算数', '数学'],
        officialFocus: '四則計算、図形、表やグラフなど、考えて解く力を広げます。',
        required: true,
        strands: ['わり算', '小数・分数の基礎', '角と図形', '表とグラフ'],
      },
      {
        id: 'science-elementary-mid',
        label: '理科',
        aliases: ['理科'],
        officialFocus: '観察・実験を通して、自然の決まりや変化を理解します。',
        required: true,
        strands: ['植物と昆虫', '太陽と影', '電気のはたらき', '物の性質'],
      },
      {
        id: 'social-elementary-mid',
        label: '社会',
        aliases: ['社会', '歴史と旅行'],
        officialFocus: '地域社会の仕事や暮らし、地図の見方を学びます。',
        required: true,
        strands: ['地域の仕事', '地図記号', '消防・警察', '市町村のくらし'],
      },
    ],
  },
  {
    id: 'elementary-5-6',
    label: '小学5-6年コース',
    ageMin: 10,
    ageMax: 12,
    overview: '教科内容が抽象化し始める学年で、思考力と基礎知識の接続を強めるコースです。',
    sourceLevel: 'elementary',
    subjects: [
      {
        id: 'japanese-elementary-upper',
        label: '国語',
        aliases: ['国語', '日本語'],
        officialFocus: '資料を踏まえて自分の考えを書く・伝える力を伸ばします。',
        required: true,
        strands: ['要旨と意見', '資料を使った説明', '言葉のきまり', '古典に親しむ入口'],
      },
      {
        id: 'math-elementary-upper',
        label: '算数',
        aliases: ['算数', '数学'],
        officialFocus: '割合、速さ、比、立体など中学数学につながる基礎を固めます。',
        required: true,
        strands: ['割合と百分率', '速さ', '比と比例', '立体・体積'],
      },
      {
        id: 'science-elementary-upper',
        label: '理科',
        aliases: ['理科'],
        officialFocus: '生命、物質、エネルギー、地球領域の基礎概念を学びます。',
        required: true,
        strands: ['人体と生物', '水溶液', 'てこと電磁石', '天気と土地'],
      },
      {
        id: 'social-elementary-upper',
        label: '社会',
        aliases: ['社会', '歴史と旅行'],
        officialFocus: '日本の産業、歴史、政治の入口を体系的に学びます。',
        required: true,
        strands: ['産業と貿易', '日本の歴史', '政治のしくみ', '国際理解の基礎'],
      },
      {
        id: 'english-elementary',
        label: '英語活動',
        aliases: ['英語'],
        officialFocus: '身近な話題で伝え合う経験を通して、英語に慣れ親しみます。',
        required: true,
        strands: ['自己紹介', '質問と応答', '音声と語順', '短い会話表現'],
      },
    ],
  },
  {
    id: 'junior-high-1',
    label: '中学1年コース',
    ageMin: 13,
    ageMax: 13,
    overview: '教科ごとの基礎概念を体系的に学び始める時期に合わせたコースです。',
    sourceLevel: 'juniorHigh',
    subjects: [
      {
        id: 'japanese-jh-1',
        label: '国語',
        aliases: ['国語', '日本語'],
        officialFocus: '目的に応じた読む・書く・話す力を深めます。',
        required: true,
        strands: ['説明文の構成', '文学的文章の読解', '意見文', '文法の基礎'],
      },
      {
        id: 'math-jh-1',
        label: '数学',
        aliases: ['数学', '算数'],
        officialFocus: '正負の数、文字式、比例・反比例など中学数学の土台を作ります。',
        required: true,
        strands: ['正負の数', '文字式', '方程式の入口', '比例・反比例'],
      },
      {
        id: 'science-jh-1',
        label: '理科',
        aliases: ['理科', '物理', '化学', '生物'],
        officialFocus: '観察・実験を通じて科学的な見方を育てます。',
        required: true,
        strands: ['身近な物質', '植物の世界', '光と音', '地層と火山'],
      },
      {
        id: 'social-jh-1',
        label: '社会',
        aliases: ['社会', '歴史と旅行'],
        officialFocus: '世界地理や歴史の基礎から社会の見方を育てます。',
        required: true,
        strands: ['世界の地域', '日本の地域', '歴史の流れ', '資料読み取り'],
      },
      {
        id: 'english-jh-1',
        label: '英語',
        aliases: ['英語'],
        officialFocus: '基本文型と日常表現を使って伝え合う力を育てます。',
        required: true,
        strands: ['be動詞・一般動詞', '疑問文', '時制の基礎', '短い対話文'],
      },
    ],
  },
  {
    id: 'junior-high-2',
    label: '中学2年コース',
    ageMin: 14,
    ageMax: 14,
    overview: '基礎をつないで応用へ進む学年に合わせたコースです。',
    sourceLevel: 'juniorHigh',
    subjects: [
      {
        id: 'japanese-jh-2',
        label: '国語',
        aliases: ['国語', '日本語'],
        officialFocus: '根拠をもって読み取り、文章全体の構成を考えて表現します。',
        required: true,
        strands: ['論説文の読解', '随筆と表現', '敬語', '古文の基礎'],
      },
      {
        id: 'math-jh-2',
        label: '数学',
        aliases: ['数学', '算数'],
        officialFocus: '連立方程式、一次関数、図形の性質などを体系的に学びます。',
        required: true,
        strands: ['連立方程式', '一次関数', '平面図形', '確率の基礎'],
      },
      {
        id: 'science-jh-2',
        label: '理科',
        aliases: ['理科', '物理', '化学', '生物'],
        officialFocus: '化学変化や生物、電流などを因果関係で捉えます。',
        required: true,
        strands: ['化学変化', '電流', '動物の体', '気象'],
      },
      {
        id: 'social-jh-2',
        label: '社会',
        aliases: ['社会', '歴史と旅行'],
        officialFocus: '日本史と地理・公民の接続を強め、社会的判断の基礎を学びます。',
        required: true,
        strands: ['日本史の展開', '産業と地域', '人口と資源', '資料比較'],
      },
      {
        id: 'english-jh-2',
        label: '英語',
        aliases: ['英語'],
        officialFocus: '比較、助動詞、不定詞などを使って表現の幅を広げます。',
        required: true,
        strands: ['比較表現', '助動詞', '不定詞', '読解の基礎'],
      },
    ],
  },
  {
    id: 'junior-high-3',
    label: '中学3年コース',
    ageMin: 15,
    ageMax: 15,
    overview: '高校内容への橋渡しとして、統合的な思考と表現を仕上げるコースです。',
    sourceLevel: 'juniorHigh',
    subjects: [
      {
        id: 'japanese-jh-3',
        label: '国語',
        aliases: ['国語', '日本語'],
        officialFocus: '複数資料を関連付けて自分の考えを論述する力を育てます。',
        required: true,
        strands: ['論理的文章', '古典読解', '批評と要約', '表現の推敲'],
      },
      {
        id: 'math-jh-3',
        label: '数学',
        aliases: ['数学', '算数'],
        officialFocus: '平方根、二次方程式、相似など高校数学につながる内容を固めます。',
        required: true,
        strands: ['平方根', '二次方程式', '相似', '標本調査'],
      },
      {
        id: 'science-jh-3',
        label: '理科',
        aliases: ['理科', '物理', '化学', '生物'],
        officialFocus: '運動、イオン、遺伝、天体などをモデル化して理解します。',
        required: true,
        strands: ['運動とエネルギー', 'イオンと中和', '遺伝', '天体'],
      },
      {
        id: 'social-jh-3',
        label: '社会',
        aliases: ['社会', '歴史と旅行'],
        officialFocus: '公民的分野や現代社会の課題を考察します。',
        required: true,
        strands: ['現代社会', '政治と憲法', '経済のしくみ', '国際社会'],
      },
      {
        id: 'english-jh-3',
        label: '英語',
        aliases: ['英語'],
        officialFocus: '関係代名詞や受け身を含むまとまりある英語を扱います。',
        required: true,
        strands: ['現在完了', '受け身', '関係代名詞', '長文読解'],
      },
    ],
  },
  {
    id: 'high-school-foundation',
    label: '高校基礎コース',
    ageMin: 16,
    ageMax: 18,
    overview: '平成30年告示の高等学校学習指導要領で重視される基礎科目群を意識したコースです。',
    sourceLevel: 'highSchool',
    subjects: [
      {
        id: 'high-japanese',
        label: '現代の国語',
        aliases: ['国語', '日本語'],
        officialFocus: '実社会で必要な論理的読解と表現を鍛えます。',
        required: true,
        strands: ['論理的読解', '情報の整理', '要約・論述', '実用文'],
      },
      {
        id: 'high-math',
        label: '数学I・A',
        aliases: ['数学', '算数'],
        officialFocus: '数と式、二次関数、図形と計量、場合の数・確率の基礎を固めます。',
        required: true,
        strands: ['数と式', '二次関数', '図形と計量', '場合の数と確率'],
      },
      {
        id: 'high-science',
        label: '理科基礎',
        aliases: ['理科', '物理', '化学', '生物'],
        officialFocus: '科学と人間生活、各基礎科目の見方・考え方を学びます。',
        required: true,
        strands: ['物理基礎', '化学基礎', '生物基礎', '科学と人間生活'],
      },
      {
        id: 'high-social',
        label: '地理歴史・公民',
        aliases: ['社会', '歴史と旅行'],
        officialFocus: '歴史総合・地理総合・公共につながる視点を養います。',
        required: true,
        strands: ['歴史総合', '地理総合', '公共', '社会課題の考察'],
      },
      {
        id: 'high-english',
        label: '英語コミュニケーション',
        aliases: ['英語'],
        officialFocus: '4技能を統合しながら、実際のコミュニケーションで使う英語力を伸ばします。',
        required: true,
        strands: ['語彙・文法運用', '英文読解', '英作文', '会話・発表'],
      },
      {
        id: 'high-info',
        label: '情報I・発展学習',
        aliases: ['プログラミング'],
        officialFocus: '情報Iで重視される情報デザイン、データ活用、プログラミングの基礎に触れます。',
        required: true,
        strands: ['アルゴリズム', 'データ活用', '情報モラル', 'プログラミング基礎'],
      },
    ],
  },
];

export const ABILITY_DOMAINS: AbilityDomain[] = [
  {
    id: 'language',
    label: '言語理解',
    aliases: ['国語', '日本語', '英語', '中国語'],
    description: '読解、表現、語彙、文法、異言語運用に関する力です。',
  },
  {
    id: 'logic',
    label: '論理思考',
    aliases: ['算数', '数学', '論理パズル', 'プログラミング'],
    description: '筋道立てて考える力、条件整理、計算、アルゴリズムの力です。',
  },
  {
    id: 'science',
    label: '科学理解',
    aliases: ['理科', '物理', '化学', '生物'],
    description: '自然現象を観察し、法則や因果関係を理解する力です。',
  },
  {
    id: 'social',
    label: '社会・探究',
    aliases: ['社会', '歴史と旅行'],
    description: '歴史、地理、社会の仕組みを読み解き、背景を考える力です。',
  },
];

const COURSE_LABELS_I18N: Record<string, Record<Locale, string>> = {
  'elementary-1-2': { ja: '小学1-2年コース', en: 'Elementary Grades 1-2', zh: '小学1-2年课程' },
  'elementary-3-4': { ja: '小学3-4年コース', en: 'Elementary Grades 3-4', zh: '小学3-4年课程' },
  'elementary-5-6': { ja: '小学5-6年コース', en: 'Elementary Grades 5-6', zh: '小学5-6年课程' },
  'junior-high-1': { ja: '中学1年コース', en: 'Junior High Grade 1', zh: '初中1年课程' },
  'junior-high-2': { ja: '中学2年コース', en: 'Junior High Grade 2', zh: '初中2年课程' },
  'junior-high-3': { ja: '中学3年コース', en: 'Junior High Grade 3', zh: '初中3年课程' },
  'high-school-foundation': { ja: '高校基礎コース', en: 'High School Foundation', zh: '高中基础课程' },
};

const SUBJECT_LABELS_I18N: Record<string, Record<Locale, string>> = {
  'japanese-foundation': { ja: '国語の基礎', en: 'Japanese Basics', zh: '国语基础' },
  'math-foundation': { ja: '算数の基礎', en: 'Math Basics', zh: '算数基础' },
  'life-studies': { ja: '生活・身の回り', en: 'Life Studies', zh: '生活与身边世界' },
  'japanese-elementary-mid': { ja: '国語', en: 'Japanese', zh: '国语' },
  'math-elementary-mid': { ja: '算数', en: 'Math', zh: '算数' },
  'science-elementary-mid': { ja: '理科', en: 'Science', zh: '理科' },
  'social-elementary-mid': { ja: '社会', en: 'Social Studies', zh: '社会' },
  'japanese-elementary-upper': { ja: '国語', en: 'Japanese', zh: '国语' },
  'math-elementary-upper': { ja: '算数', en: 'Math', zh: '算数' },
  'science-elementary-upper': { ja: '理科', en: 'Science', zh: '理科' },
  'social-elementary-upper': { ja: '社会', en: 'Social Studies', zh: '社会' },
  'english-elementary': { ja: '英語活動', en: 'English Activities', zh: '英语活动' },
  'japanese-jh-1': { ja: '国語', en: 'Japanese', zh: '国语' },
  'math-jh-1': { ja: '数学', en: 'Mathematics', zh: '数学' },
  'science-jh-1': { ja: '理科', en: 'Science', zh: '理科' },
  'social-jh-1': { ja: '社会', en: 'Social Studies', zh: '社会' },
  'english-jh-1': { ja: '英語', en: 'English', zh: '英语' },
  'japanese-jh-2': { ja: '国語', en: 'Japanese', zh: '国语' },
  'math-jh-2': { ja: '数学', en: 'Mathematics', zh: '数学' },
  'science-jh-2': { ja: '理科', en: 'Science', zh: '理科' },
  'social-jh-2': { ja: '社会', en: 'Social Studies', zh: '社会' },
  'english-jh-2': { ja: '英語', en: 'English', zh: '英语' },
  'japanese-jh-3': { ja: '国語', en: 'Japanese', zh: '国语' },
  'math-jh-3': { ja: '数学', en: 'Mathematics', zh: '数学' },
  'science-jh-3': { ja: '理科', en: 'Science', zh: '理科' },
  'social-jh-3': { ja: '社会', en: 'Social Studies', zh: '社会' },
  'english-jh-3': { ja: '英語', en: 'English', zh: '英语' },
  'high-japanese': { ja: '現代の国語', en: 'Modern Japanese', zh: '现代国语' },
  'high-math': { ja: '数学I・A', en: 'Math I & A', zh: '数学I・A' },
  'high-science': { ja: '理科基礎', en: 'Basic Science', zh: '理科基础' },
  'high-social': { ja: '地理歴史・公民', en: 'Geography, History & Civics', zh: '地理历史与公民' },
  'high-english': { ja: '英語コミュニケーション', en: 'English Communication', zh: '英语沟通' },
  'high-info': { ja: '情報I・発展学習', en: 'Informatics I & Extended Study', zh: '信息I与拓展学习' },
};

const ABILITY_DOMAIN_LABELS_I18N: Record<string, Record<Locale, { label: string; description: string }>> = {
  language: {
    ja: { label: '言語理解', description: '読解、表現、語彙、文法、異言語運用に関する力です。' },
    en: { label: 'Language', description: 'Reading, expression, vocabulary, grammar, and multilingual usage skills.' },
    zh: { label: '语言理解', description: '与阅读、表达、词汇、语法和多语言运用相关的能力。' },
  },
  logic: {
    ja: { label: '論理思考', description: '筋道立てて考える力、条件整理、計算、アルゴリズムの力です。' },
    en: { label: 'Logic', description: 'Structured thinking, condition handling, calculation, and algorithmic reasoning.' },
    zh: { label: '逻辑思维', description: '有条理思考、条件整理、计算与算法推理能力。' },
  },
  science: {
    ja: { label: '科学理解', description: '自然現象を観察し、法則や因果関係を理解する力です。' },
    en: { label: 'Science', description: 'Observing natural phenomena and understanding rules and causality.' },
    zh: { label: '科学理解', description: '观察自然现象并理解规律与因果关系的能力。' },
  },
  social: {
    ja: { label: '社会・探究', description: '歴史、地理、社会の仕組みを読み解き、背景を考える力です。' },
    en: { label: 'Society & Inquiry', description: 'Understanding history, geography, and social systems with context.' },
    zh: { label: '社会与探究', description: '解读历史、地理与社会结构，并思考其背景的能力。' },
  },
};

export function getCurriculumSourceLabel(locale: Locale, sourceLevel: CurriculumSourceLevel) {
  return CURRICULUM_SOURCE_LABELS_I18N[locale][sourceLevel];
}

export function getCourseLabel(locale: Locale, courseId: string, fallback: string) {
  return COURSE_LABELS_I18N[courseId]?.[locale] || fallback;
}

export function getSubjectLabel(locale: Locale, subjectId: string, fallback: string) {
  return SUBJECT_LABELS_I18N[subjectId]?.[locale] || fallback;
}

export function getAbilityDomainText(locale: Locale, domainId: string, fallbackLabel: string, fallbackDescription: string) {
  const localized = ABILITY_DOMAIN_LABELS_I18N[domainId]?.[locale];
  return {
    label: localized?.label || fallbackLabel,
    description: localized?.description || fallbackDescription,
  };
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, '').trim();
}

function categoryTexts(category: CategoryLike) {
  return [
    category.name,
    category.nameJa,
    category.nameEn,
    category.nameZh,
    category.ja,
    category.en,
    category.zh,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
    .map(normalizeText);
}

export function getCurriculumCourseForAge(age: number | null | undefined) {
  if (typeof age !== 'number') {
    return CURRICULUM_COURSES[2];
  }

  return CURRICULUM_COURSES.find((course) => age >= course.ageMin && age <= course.ageMax) || CURRICULUM_COURSES[CURRICULUM_COURSES.length - 1];
}

export function findCategoryIdsForAliases(categories: CategoryLike[], aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeText);

  return categories
    .filter((category) => {
      const texts = categoryTexts(category);
      return normalizedAliases.some((alias) => texts.some((text) => text.includes(alias)));
    })
    .map((category) => category.id);
}

export function buildCourseProgress(params: {
  course: CurriculumCourse;
  categories: CategoryLike[];
  quizzes: QuizLike[];
  histories: HistoryLike[];
}) {
  const { course, categories, quizzes, histories } = params;
  const solvedQuizIds = new Set(histories.filter((history) => history.isCorrect).map((history) => history.quizId));

  const subjects: CourseSubjectProgress[] = course.subjects.map((subject) => {
    const categoryIds = findCategoryIdsForAliases(categories, subject.aliases);
    const availableQuizzes = quizzes.filter(
      (quiz) =>
        categoryIds.includes(quiz.categoryId) &&
        quiz.targetAge >= course.ageMin - 1 &&
        quiz.targetAge <= course.ageMax + 1
    );
    const solvedQuizCount = availableQuizzes.filter((quiz) => solvedQuizIds.has(quiz.id)).length;
    const progress = availableQuizzes.length > 0
      ? Math.round((solvedQuizCount / availableQuizzes.length) * 100)
      : 0;

    return {
      subject,
      categoryIds,
      availableQuizCount: availableQuizzes.length,
      solvedQuizCount,
      progress,
    };
  });

  const totalAvailableQuizCount = subjects.reduce((sum, subject) => sum + subject.availableQuizCount, 0);
  const totalSolvedQuizCount = subjects.reduce((sum, subject) => sum + subject.solvedQuizCount, 0);
  const progress = totalAvailableQuizCount > 0
    ? Math.round((totalSolvedQuizCount / totalAvailableQuizCount) * 100)
    : 0;

  return {
    course,
    progress,
    totalAvailableQuizCount,
    totalSolvedQuizCount,
    subjects,
  } satisfies CourseProgress;
}

export function buildAbilityDomainScores(params: {
  categories: CategoryLike[];
  quizzes: QuizLike[];
  histories: HistoryLike[];
}) {
  const { categories, quizzes, histories } = params;
  const quizById = new Map(quizzes.map((quiz) => [quiz.id, quiz]));

  return ABILITY_DOMAINS.map((domain) => {
    const categoryIds = new Set(findCategoryIdsForAliases(categories, domain.aliases));
    const relevantHistories = histories.filter((history) => {
      const quiz = quizById.get(history.quizId);
      return !!quiz && categoryIds.has(quiz.categoryId);
    });
    const correctCount = relevantHistories.filter((history) => history.isCorrect).length;
    const totalAttempts = relevantHistories.length;
    const wrongCount = totalAttempts - correctCount;
    const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;

    return {
      domain,
      totalAttempts,
      correctCount,
      wrongCount,
      accuracy,
    } satisfies AbilityDomainScore;
  });
}

export function countActiveDays(histories: HistoryLike[], recentDays: number) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - recentDays + 1);

  return new Set(
    histories
      .filter((history) => history.createdAt >= cutoff)
      .map((history) => history.createdAt.toISOString().slice(0, 10))
  ).size;
}
