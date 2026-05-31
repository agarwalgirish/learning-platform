/**
 * Seed file — creates a demo organization, admin user, instructor, learner,
 * a sample topic, and a sample document chunk (without actual embeddings).
 *
 * Run with: npm run db:seed
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ── Organization ──────────────────────────────────────────────────────────
  const org = await db.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo-org',
      plan: 'pro',
    },
  })
  console.log('✅ Organization:', org.name)

  // ── Users ─────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin123!', 12)
  const admin = await db.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@demo.com',
      passwordHash: adminHash,
      role: 'ADMIN',
      organizationId: org.id,
    },
  })

  const instructorHash = await bcrypt.hash('Instructor123!', 12)
  const instructor = await db.user.upsert({
    where: { email: 'instructor@demo.com' },
    update: {},
    create: {
      name: 'Sarah Instructor',
      email: 'instructor@demo.com',
      passwordHash: instructorHash,
      role: 'INSTRUCTOR',
      organizationId: org.id,
    },
  })

  const learnerHash = await bcrypt.hash('Learner123!', 12)
  const learner = await db.user.upsert({
    where: { email: 'learner@demo.com' },
    update: {},
    create: {
      name: 'John Learner',
      email: 'learner@demo.com',
      passwordHash: learnerHash,
      role: 'LEARNER',
      organizationId: org.id,
    },
  })

  console.log('✅ Users created: admin, instructor, learner')

  // ── Topics ────────────────────────────────────────────────────────────────
  const topic1 = await db.topic.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: 'machine-learning-fundamentals' } },
    update: {},
    create: {
      name: 'Machine Learning Fundamentals',
      slug: 'machine-learning-fundamentals',
      description: 'Learn the core concepts of machine learning including supervised and unsupervised learning, model training, and evaluation.',
      category: 'Data Science',
      difficulty: 'INTERMEDIATE',
      estimatedHours: 8,
      isPublished: true,
      organizationId: org.id,
    },
  })

  const topic2 = await db.topic.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: 'python-for-data-science' } },
    update: {},
    create: {
      name: 'Python for Data Science',
      slug: 'python-for-data-science',
      description: 'Master Python libraries like NumPy, Pandas, and Matplotlib for data analysis and visualization.',
      category: 'Data Science',
      difficulty: 'BEGINNER',
      estimatedHours: 6,
      isPublished: true,
      organizationId: org.id,
    },
  })

  const topic3 = await db.topic.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: 'enterprise-security' } },
    update: {},
    create: {
      name: 'Enterprise Security Fundamentals',
      slug: 'enterprise-security',
      description: 'Understand zero-trust architecture, identity management, threat detection, and compliance frameworks.',
      category: 'Security',
      difficulty: 'ADVANCED',
      estimatedHours: 10,
      isPublished: true,
      organizationId: org.id,
    },
  })

  console.log('✅ Topics created:', topic1.name, '|', topic2.name, '|', topic3.name)

  // ── Sample Document ───────────────────────────────────────────────────────
  const doc = await db.uploadedDocument.create({
    data: {
      fileName: 'sample-ml-intro.txt',
      originalName: 'Introduction to Machine Learning.txt',
      mimeType: 'text/plain',
      fileSize: 2048,
      storagePath: './uploads/sample-ml-intro.txt',
      status: 'READY',
      extractedText: 'Machine learning is a subset of artificial intelligence...',
      uploadedById: admin.id,
      organizationId: org.id,
      topicId: topic1.id,
    },
  })

  // Sample chunks WITHOUT embeddings (embeddings require AI API key)
  const sampleChunks = [
    'Machine learning is a subset of artificial intelligence that enables computers to learn from data without being explicitly programmed. It focuses on developing algorithms that can access data and use it to learn for themselves.',
    'Supervised learning uses labeled training data to teach models to predict outcomes. Common algorithms include linear regression, decision trees, random forests, and neural networks.',
    'Unsupervised learning finds hidden patterns in data without labeled examples. Clustering algorithms like K-means group similar data points together.',
    'Model evaluation metrics include accuracy, precision, recall, F1-score, and ROC-AUC. Cross-validation helps prevent overfitting by testing the model on unseen data.',
    'Feature engineering is the process of transforming raw data into meaningful features that improve model performance. It includes normalization, encoding categorical variables, and handling missing values.',
  ]

  for (let i = 0; i < sampleChunks.length; i++) {
    await db.documentChunk.create({
      data: {
        documentId: doc.id,
        content: sampleChunks[i],
        chunkIndex: i,
        pageNumber: i + 1,
        tokenCount: Math.ceil(sampleChunks[i].length / 4),
      },
    })
  }

  console.log('✅ Sample document and chunks created')

  // ── AI Config ─────────────────────────────────────────────────────────────
  await db.aIConfig.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      provider: 'openai',
      model: 'gpt-4o',
      embeddingModel: 'text-embedding-3-small',
      temperature: 0.7,
      maxTokens: 2000,
      useOnlyKB: true,
    },
  })

  // ── Learner Progress ──────────────────────────────────────────────────────
  await db.enrollment.upsert({
    where: { userId_topicId: { userId: learner.id, topicId: topic1.id } },
    update: {},
    create: { userId: learner.id, topicId: topic1.id, status: 'IN_PROGRESS' },
  })

  await db.learnerProgress.upsert({
    where: { userId_topicId: { userId: learner.id, topicId: topic1.id } },
    update: {},
    create: {
      userId: learner.id,
      topicId: topic1.id,
      proficiencyLevel: 'INTERMEDIATE',
      proficiencyScore: 58,
      timeSpentMinutes: 45,
      quizzesTaken: 3,
      avgQuizScore: 62,
      lastActivityAt: new Date(),
    },
  })

  console.log('✅ Sample learner progress created')

  // ── Audit log ─────────────────────────────────────────────────────────────
  await db.auditLog.createMany({
    data: [
      { organizationId: org.id, userId: admin.id, action: 'user.login', resource: 'User', resourceId: admin.id },
      { organizationId: org.id, userId: instructor.id, action: 'document.upload', resource: 'Document', resourceId: doc.id },
      { organizationId: org.id, userId: learner.id, action: 'user.login', resource: 'User', resourceId: learner.id },
    ],
  })

  console.log('\n✅ Seed complete!')
  console.log('\n📋 Demo credentials:')
  console.log('   Admin:      admin@demo.com / Admin123!')
  console.log('   Instructor: instructor@demo.com / Instructor123!')
  console.log('   Learner:    learner@demo.com / Learner123!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
