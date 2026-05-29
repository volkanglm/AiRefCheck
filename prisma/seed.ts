/**
 * AiRefCheck - Database Seed
 * Creates test users, documents, analyses for development.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create test users
  const adminPassword = await bcrypt.hash("admin123", 12);
  const proPassword = await bcrypt.hash("pro123", 12);
  const freePassword = await bcrypt.hash("free123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@airefcheck.com" },
    update: {},
    create: { email: "admin@airefcheck.com", passwordHash: adminPassword, firstName: "Admin", lastName: "User", role: "SYSTEM_ADMIN" },
  });

  const pro = await prisma.user.upsert({
    where: { email: "pro@airefcheck.com" },
    update: {},
    create: { email: "pro@airefcheck.com", passwordHash: proPassword, firstName: "Pro", lastName: "Araştırmacı", role: "PRO" },
  });

  const free = await prisma.user.upsert({
    where: { email: "free@airefcheck.com" },
    update: {},
    create: { email: "free@airefcheck.com", passwordHash: freePassword, firstName: "Free", lastName: "Danışman", role: "FREE" },
  });

  console.log(`  ✓ Users: admin@, pro@, free@airefcheck.com`);

  // Create sample documents
  const doc1 = await prisma.document.create({
    data: { userId: pro.id, originalName: "ornek_tez.pdf", storedName: "seed-doc-1.pdf", format: "PDF", fileSize: 1024000, mimeType: "application/pdf", status: "ANALYZED" },
  });

  const doc2 = await prisma.document.create({
    data: { userId: free.id, originalName: "makale_referanslar.docx", storedName: "seed-doc-2.docx", format: "DOCX", fileSize: 512000, mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", status: "ANALYZED" },
  });

  console.log(`  ✓ Documents: 2 sample docs`);

  // Create sample analyses
  const analysis1 = await prisma.analysis.create({
    data: {
      documentId: doc1.id, status: "COMPLETED", progress: 100,
      detectedStyle: "apa7", styleConfidence: 0.92,
      totalReferences: 15, verifiedCount: 10, suspiciousCount: 2,
      notFoundCount: 1, partialMatchCount: 1, missingCount: 1, orphanCount: 0,
      overallScore: 73.3, startedAt: new Date(Date.now() - 60000), completedAt: new Date(),
      processingTimeMs: 45000,
    },
  });

  const analysis2 = await prisma.analysis.create({
    data: {
      documentId: doc2.id, status: "COMPLETED", progress: 100,
      detectedStyle: "ieee", styleConfidence: 0.88,
      totalReferences: 8, verifiedCount: 6, suspiciousCount: 0,
      notFoundCount: 0, partialMatchCount: 1, missingCount: 1, orphanCount: 1,
      overallScore: 87.5, startedAt: new Date(Date.now() - 30000), completedAt: new Date(),
      processingTimeMs: 25000,
    },
  });

  console.log(`  ✓ Analyses: 2 sample analyses`);

  // Create sample references for analysis1
  const sampleRefs = [
    { raw: 'Silver, D., Hubert, T., Schrittwieser, J., et al. (2018). A general reinforcement learning algorithm that masters chess, shogi, and Go through self-play. Science, 362(6419), 1140-1144.', status: "VERIFIED", score: 95, doi: "10.1126/science.aar6404" },
    { raw: 'Vaswani, A., Shazeer, N., Parmar, N., et al. (2017). Attention is all you need. Advances in Neural Information Processing Systems, 30, 5998-6008.', status: "VERIFIED", score: 92 },
    { raw: 'Brown, T. B., Mann, B., Ryder, N., et al. (2020). Language models are few-shot learners. Advances in Neural Information Processing Systems, 33, 1877-1901.', status: "VERIFIED", score: 90, doi: "10.5555/3495724.3495883" },
    { raw: 'Devlin, J., Chang, M. W., Lee, K., & Toutanova, K. (2019). BERT: Pre-training of deep bidirectional transformers for language understanding. NAACL-HLT, 4171-4186.', status: "VERIFIED", score: 93 },
    { raw: 'He, K., Zhang, X., Ren, S., & Sun, J. (2016). Deep residual learning for image recognition. CVPR, 770-778.', status: "VERIFIED", score: 91 },
    { raw: 'Goodfellow, I., Bengio, Y., & Courville, A. (2016). Deep learning. MIT Press.', status: "VERIFIED", score: 88 },
    { raw: 'LeCun, Y., Bengio, Y., & Hinton, G. (2015). Deep learning. Nature, 521(7553), 436-444.', status: "VERIFIED", score: 96, doi: "10.1038/nature14539" },
    { raw: 'Krizhevsky, A., Sutskever, I., & Hinton, G. E. (2012). ImageNet classification with deep convolutional neural networks. NeurIPS, 1097-1105.', status: "VERIFIED", score: 89 },
    { raw: 'Hochreiter, S., & Schmidhuber, J. (1997). Long short-term memory. Neural Computation, 9(8), 1735-1780.', status: "VERIFIED", score: 94 },
    { raw: 'Sutton, R. S., & Barto, A. G. (2018). Reinforcement learning: An introduction. MIT Press.', status: "VERIFIED", score: 87 },
    { raw: 'Fake, A. B., & Nonexistent, C. D. (2025). Quantum neural consciousness networks. Journal of Imaginary Science, 99(1), 1-50.', status: "NOT_FOUND", score: 15 },
    { raw: 'Questionable, X. Y. (2024). Suspicious claims about everything. Doubtful Proceedings, 1(1), 999-1001.', status: "SUSPICIOUS", score: 25 },
    { raw: 'Yılmaz, A., & Demir, B. (2023). Türkçe doğal dil işleme araçları. Dergipark Journal of NLP, 5(2), 45-60.', status: "PARTIAL_MATCH", score: 55 },
    { raw: 'Chen, Z., & Lee, M. (2022). Advanced machine learning techniques. In K. Wang (Ed.), Handbook of AI (pp. 200-220). Springer.', status: "VERIFIED", score: 82 },
    { raw: 'World Health Organization. (2023). Global health report 2023. https://www.who.int/report', status: "VERIFIED", score: 78 },
  ];

  for (let i = 0; i < sampleRefs.length; i++) {
    const ref = sampleRefs[i];
    await prisma.reference.create({
      data: {
        analysisId: analysis1.id, orderIndex: i + 1,
        rawText: ref.raw, authors: [], title: ref.raw.split(".")[1]?.trim() || null,
        year: parseInt(ref.raw.match(/\((\d{4})\)/)?.[1] || "0") || null,
        doi: ref.doi || null, refType: "JOURNAL_ARTICLE",
        parseConfidence: 0.85, status: ref.status as any,
        confidenceScore: ref.score, bestMatchSource: ref.status === "VERIFIED" ? "crossref" : null,
      },
    });
  }

  console.log(`  ✓ References: ${sampleRefs.length} sample references`);

  // Create summary
  await prisma.analysisSummary.create({
    data: {
      analysisId: analysis1.id,
      statusDistribution: { verified: 10, suspicious: 2, not_found: 1, partial_match: 1, missing: 1 },
      sourceDistribution: { crossref: 12, semantic_scholar: 10, openalex: 9 },
      scoreDistribution: { "90-100": 4, "80-89": 5, "50-79": 1, "0-49": 3 },
      yearDistribution: { "2015": 1, "2016": 1, "2017": 1, "2018": 1, "2019": 1, "2020": 1, "2022": 1, "2023": 2, "2024": 1, "2025": 1 },
      referenceTypeDist: { journal_article: 11, book: 2, book_chapter: 1, web_page: 1 },
      warnings: [{ type: "mixed_style", detail: "Kaynakça çoğunlukla APA 7, ancak bazı referanslar farklı formatta" }],
      recommendations: ["Referans 11 uydurma şüphesi taşıyor — manuel kontrol edin", "Referans 12kısmen eşleşti — detayları kontrol edin"],
    },
  });

  console.log("✅ Seed complete!");
  console.log("\n📧 Test Accounts:");
  console.log("  admin@airefcheck.com  / admin123  (System Admin)");
  console.log("  pro@airefcheck.com   / pro123    (Pro User)");
  console.log("  free@airefcheck.com  / free123   (Free User)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
