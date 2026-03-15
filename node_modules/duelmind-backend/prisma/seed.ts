import { PrismaClient, Difficulty, Language, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function makeOptions(a: string, b: string, c: string, d: string) {
  return [
    { key: 'A', text: a },
    { key: 'B', text: b },
    { key: 'C', text: c },
    { key: 'D', text: d },
  ]
}

async function main() {
  console.log('🌱 Seeding DuelMind...')

  // ── Users ──────────────────────────────────────────────────────
  const adminPw = await bcrypt.hash('admin123', 10)
  const userPw  = await bcrypt.hash('demo1234', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@duelmind.app' },
    // update: always refresh the password so re-running seed fixes broken logins
    update: { passwordHash: adminPw, isSuspended: false },
    create: {
      username: 'admin',
      email: 'admin@duelmind.app',
      passwordHash: adminPw,
      role: Role.SUPERADMIN,
      profile: { create: { displayName: 'Admin', language: Language.en } },
    },
  })

  const alice = await prisma.user.upsert({
    where: { email: 'alice@demo.com' },
    update: { passwordHash: userPw, isSuspended: false },
    create: {
      username: 'alice_q',
      email: 'alice@demo.com',
      passwordHash: userPw,
      profile: { create: { displayName: 'Alice', language: Language.en, totalXp: 1200, totalWins: 8, totalDuels: 12 } },
    },
  })

  const bob = await prisma.user.upsert({
    where: { email: 'bob@demo.com' },
    update: { passwordHash: userPw, isSuspended: false },
    create: {
      username: 'bob_z',
      email: 'bob@demo.com',
      passwordHash: userPw,
      profile: { create: { displayName: 'Bob', language: Language.en, totalXp: 900, totalWins: 5, totalDuels: 10 } },
    },
  })

  // ── Categories ─────────────────────────────────────────────────
  const cats = await Promise.all([
    prisma.category.upsert({ where: { slug: 'science' },    update: {}, create: { name: 'Science',     slug: 'science',     icon: '🔬', color: '#3B82F6', sortOrder: 1 } }),
    prisma.category.upsert({ where: { slug: 'history' },    update: {}, create: { name: 'History',     slug: 'history',     icon: '📜', color: '#8B5CF6', sortOrder: 2 } }),
    prisma.category.upsert({ where: { slug: 'sports' },     update: {}, create: { name: 'Sports',      slug: 'sports',      icon: '⚽', color: '#10B981', sortOrder: 3 } }),
    prisma.category.upsert({ where: { slug: 'geography' },  update: {}, create: { name: 'Geography',   slug: 'geography',   icon: '🌍', color: '#F59E0B', sortOrder: 4 } }),
    prisma.category.upsert({ where: { slug: 'technology' }, update: {}, create: { name: 'Technology',  slug: 'technology',  icon: '💻', color: '#EF4444', sortOrder: 5 } }),
    prisma.category.upsert({ where: { slug: 'pop-culture'},  update: {}, create: { name: 'Pop Culture', slug: 'pop-culture', icon: '🎬', color: '#EC4899', sortOrder: 6 } }),
  ])
  const [science, history, sports, geography, technology, popCulture] = cats

  // ── Questions ──────────────────────────────────────────────────
  const questions = [
    // Science - Easy
    { categoryId: science.id, language: Language.en, difficulty: Difficulty.EASY,
      questionText: 'What is the chemical symbol for water?',
      answerOptions: makeOptions('H2O', 'CO2', 'O2', 'NaCl'), correctAnswer: 'A',
      explanation: 'Water is two hydrogen atoms bonded to one oxygen atom — H2O.' },
    { categoryId: science.id, language: Language.en, difficulty: Difficulty.EASY,
      questionText: 'How many bones does an adult human body have?',
      answerOptions: makeOptions('196', '206', '216', '226'), correctAnswer: 'B',
      explanation: 'Adults have 206 bones. Babies start with ~270 that fuse over time.' },
    // Science - Medium
    { categoryId: science.id, language: Language.en, difficulty: Difficulty.MEDIUM,
      questionText: 'What is the speed of light in a vacuum (approximately)?',
      answerOptions: makeOptions('300,000 km/s', '150,000 km/s', '500,000 km/s', '1,000,000 km/s'), correctAnswer: 'A',
      explanation: 'Light travels at ~299,792 km/s in a vacuum.' },
    { categoryId: science.id, language: Language.en, difficulty: Difficulty.MEDIUM,
      questionText: 'What planet is known as the Red Planet?',
      answerOptions: makeOptions('Venus', 'Jupiter', 'Mars', 'Saturn'), correctAnswer: 'C',
      explanation: 'Mars appears red due to iron oxide (rust) on its surface.' },
    // Science - Hard
    { categoryId: science.id, language: Language.en, difficulty: Difficulty.HARD,
      questionText: 'What is the half-life of Carbon-14?',
      answerOptions: makeOptions('1,000 years', '5,730 years', '10,000 years', '50,000 years'), correctAnswer: 'B',
      explanation: 'Carbon-14 decays with a half-life of 5,730 years, making it ideal for radiocarbon dating.' },
    // History
    { categoryId: history.id, language: Language.en, difficulty: Difficulty.EASY,
      questionText: 'In which year did World War II end?',
      answerOptions: makeOptions('1943', '1944', '1945', '1946'), correctAnswer: 'C',
      explanation: 'WWII ended in 1945 — Germany surrendered in May, Japan in September.' },
    { categoryId: history.id, language: Language.en, difficulty: Difficulty.MEDIUM,
      questionText: 'Who was the first President of the United States?',
      answerOptions: makeOptions('John Adams', 'Thomas Jefferson', 'Benjamin Franklin', 'George Washington'), correctAnswer: 'D',
      explanation: 'George Washington served as the 1st US President from 1789 to 1797.' },
    { categoryId: history.id, language: Language.en, difficulty: Difficulty.MEDIUM,
      questionText: 'In which year did the Titanic sink?',
      answerOptions: makeOptions('1908', '1910', '1912', '1915'), correctAnswer: 'C',
      explanation: 'The Titanic sank on April 15, 1912 after striking an iceberg.' },
    { categoryId: history.id, language: Language.en, difficulty: Difficulty.HARD,
      questionText: 'Which empire built the Hagia Sophia in Constantinople?',
      answerOptions: makeOptions('Roman Empire', 'Ottoman Empire', 'Byzantine Empire', 'Persian Empire'), correctAnswer: 'C',
      explanation: 'The Hagia Sophia was built by the Byzantine Emperor Justinian I in 537 AD.' },
    // Sports
    { categoryId: sports.id, language: Language.en, difficulty: Difficulty.EASY,
      questionText: 'How many players are on a standard soccer team on the field?',
      answerOptions: makeOptions('9', '10', '11', '12'), correctAnswer: 'C',
      explanation: 'Each soccer team fields 11 players, including the goalkeeper.' },
    { categoryId: sports.id, language: Language.en, difficulty: Difficulty.MEDIUM,
      questionText: 'How many rings are on the Olympic flag?',
      answerOptions: makeOptions('4', '5', '6', '7'), correctAnswer: 'B',
      explanation: 'The Olympic flag has 5 interlocking rings representing the five continents.' },
    // Geography
    { categoryId: geography.id, language: Language.en, difficulty: Difficulty.EASY,
      questionText: 'What is the capital of France?',
      answerOptions: makeOptions('London', 'Berlin', 'Madrid', 'Paris'), correctAnswer: 'D',
      explanation: 'Paris is the capital and largest city of France.' },
    { categoryId: geography.id, language: Language.en, difficulty: Difficulty.EASY,
      questionText: 'What is the largest ocean on Earth?',
      answerOptions: makeOptions('Atlantic', 'Indian', 'Pacific', 'Arctic'), correctAnswer: 'C',
      explanation: 'The Pacific Ocean covers more than 30% of Earth\'s surface.' },
    { categoryId: geography.id, language: Language.en, difficulty: Difficulty.MEDIUM,
      questionText: 'Which is the longest river in the world?',
      answerOptions: makeOptions('Amazon', 'Yangtze', 'Mississippi', 'Nile'), correctAnswer: 'D',
      explanation: 'The Nile River in Africa is ~6,650 km long, making it the longest.' },
    { categoryId: geography.id, language: Language.en, difficulty: Difficulty.MEDIUM,
      questionText: 'What country has the largest land area in the world?',
      answerOptions: makeOptions('Canada', 'Russia', 'China', 'United States'), correctAnswer: 'B',
      explanation: 'Russia covers ~17.1 million km², the largest of any country.' },
    // Technology
    { categoryId: technology.id, language: Language.en, difficulty: Difficulty.EASY,
      questionText: 'What does "HTTP" stand for?',
      answerOptions: makeOptions('HyperText Transfer Protocol', 'High Traffic Transfer Protocol', 'HyperText Transmission Process', 'Host Transfer Text Protocol'), correctAnswer: 'A',
      explanation: 'HTTP (HyperText Transfer Protocol) is the foundation of web communication.' },
    { categoryId: technology.id, language: Language.en, difficulty: Difficulty.MEDIUM,
      questionText: 'Who invented the World Wide Web?',
      answerOptions: makeOptions('Bill Gates', 'Steve Jobs', 'Tim Berners-Lee', 'Vint Cerf'), correctAnswer: 'C',
      explanation: 'Tim Berners-Lee invented the World Wide Web in 1989 at CERN.' },
    { categoryId: technology.id, language: Language.en, difficulty: Difficulty.MEDIUM,
      questionText: 'What programming language was created by Guido van Rossum?',
      answerOptions: makeOptions('Java', 'Ruby', 'Python', 'Perl'), correctAnswer: 'C',
      explanation: 'Guido van Rossum created Python, first released in 1991.' },
    { categoryId: technology.id, language: Language.en, difficulty: Difficulty.HARD,
      questionText: 'What is the time complexity of binary search?',
      answerOptions: makeOptions('O(n)', 'O(n²)', 'O(log n)', 'O(1)'), correctAnswer: 'C',
      explanation: 'Binary search is O(log n) — it halves the search space each step.' },
    // Pop Culture
    { categoryId: popCulture.id, language: Language.en, difficulty: Difficulty.EASY,
      questionText: 'Who wrote "Romeo and Juliet"?',
      answerOptions: makeOptions('Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'), correctAnswer: 'B',
      explanation: 'Romeo and Juliet was written by William Shakespeare around 1594–1596.' },
    // Azerbaijani
    { categoryId: geography.id, language: Language.az, difficulty: Difficulty.EASY,
      questionText: 'Azərbaycanın paytaxtı hansı şəhərdir?',
      answerOptions: makeOptions('Gəncə', 'Bakı', 'Sumqayıt', 'Lənkəran'), correctAnswer: 'B',
      explanation: 'Bakı Azərbaycanın paytaxtı və ən böyük şəhəridir.' },
    { categoryId: science.id, language: Language.az, difficulty: Difficulty.EASY,
      questionText: 'Günəş sistemindəki ən böyük planet hansıdır?',
      answerOptions: makeOptions('Saturn', 'Yupiter', 'Uran', 'Neptun'), correctAnswer: 'B',
      explanation: 'Yupiter Günəş sisteminin ən böyük planetidir.' },
    // Russian
    { categoryId: history.id, language: Language.ru, difficulty: Difficulty.MEDIUM,
      questionText: 'В каком году была основана Москва?',
      answerOptions: makeOptions('1147', '1200', '1300', '988'), correctAnswer: 'A',
      explanation: 'Москва была основана в 1147 году князем Юрием Долгоруким.' },
    { categoryId: geography.id, language: Language.ru, difficulty: Difficulty.EASY,
      questionText: 'Какая река является самой длинной в России?',
      answerOptions: makeOptions('Волга', 'Обь', 'Лена', 'Амур'), correctAnswer: 'C',
      explanation: 'Лена — самая длинная река в России, протяжённостью около 4 400 км.' },
  ]

  for (const q of questions) {
    await prisma.question.create({ data: q as any })
  }

  console.log(`  ✓ ${questions.length} questions created`)

  // ── Game configs ────────────────────────────────────────────────
  const games = ['REACTION_TAP', 'ONE_SECOND', 'COLOR_TAP', 'MEMORY_FLIP', 'PATTERN_MATCH', 'SPEED_CHOICE']
  for (const gameType of games) {
    await prisma.gameConfig.upsert({
      where: { gameType },
      update: {},
      create: {
        gameType,
        isEnabled: true,
        config: { timeLimit: 30, pointsPerCorrect: 100, penaltyMs: 500, difficulty: 'MEDIUM' },
      },
    })
  }
  console.log(`  ✓ ${games.length} game configs created`)

  // ── Leaderboard seed ────────────────────────────────────────────
  for (const user of [alice, bob]) {
    for (const boardType of ['GLOBAL', 'TRIVIA', 'REACTION']) {
      const score = user.id === alice.id ? 1200 : 900
      await prisma.leaderboard.upsert({
        where: { userId_boardType: { userId: user.id, boardType } },
        update: {},
        create: { userId: user.id, boardType, score, rank: 0 },
      })
    }
  }

  console.log('\n✅ Seed complete!\n')
  console.log('  🔑 Admin:  admin@duelmind.app  / admin123')
  console.log('  👤 Demo 1: alice@demo.com       / demo1234')
  console.log('  👤 Demo 2: bob@demo.com         / demo1234')

  // ── Verify passwords were stored correctly ──────────────────────
  console.log('\n🔍 Verifying password hashes...')
  const adminCheck = await prisma.user.findUnique({ where: { email: 'admin@duelmind.app' } })
  const aliceCheck = await prisma.user.findUnique({ where: { email: 'alice@demo.com' } })

  if (!adminCheck?.passwordHash) {
    console.error('  ❌ admin passwordHash is missing!')
  } else {
    const adminOk = await bcrypt.compare('admin123', adminCheck.passwordHash)
    console.log(`  ${adminOk ? '✓' : '❌'} admin@duelmind.app: ${adminOk ? 'OK' : 'HASH MISMATCH'}`)
  }

  if (!aliceCheck?.passwordHash) {
    console.error('  ❌ alice passwordHash is missing!')
  } else {
    const aliceOk = await bcrypt.compare('demo1234', aliceCheck.passwordHash)
    console.log(`  ${aliceOk ? '✓' : '❌'} alice@demo.com: ${aliceOk ? 'OK' : 'HASH MISMATCH'}`)
  }
}

main()
  .catch(e => { console.error('Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
