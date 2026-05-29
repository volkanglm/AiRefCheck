/**
 * AiRefCheck - Document Service
 * File upload, CRUD operations, format detection.
 */

import { PrismaClient } from "@prisma/client";
import { mkdir, writeFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { v4 as uuid } from "uuid";
import { NotFoundError, ForbiddenError, ValidationError } from "../../lib/errors";
import { logger } from "../../lib/logger";
import { env } from "../../lib/env";

const ALLOWED_FORMATS: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "text/plain": ["txt"],
  "text/x-tex": ["tex"],
  "application/x-latex": ["tex"],
  "application/x-bibtex": ["bib"],
};

const FORMAT_MAP: Record<string, string> = {
  pdf: "PDF", docx: "DOCX", txt: "TXT", tex: "LATEX", bib: "BIBTEX", ris: "RIS",
};

export class DocumentService {
  constructor(private prisma: PrismaClient) {}

  async upload(userId: string, file: { filename: string; mimetype: string; data: Buffer }) {
    // Ensure upload dir
    if (!existsSync(env.UPLOAD_DIR)) await mkdir(env.UPLOAD_DIR, { recursive: true });

    const ext = path.extname(file.filename).toLowerCase().replace(".", "");
    const format = this.detectFormat(ext, file.mimetype);
    if (!format) throw new ValidationError(`Desteklenmeyen dosya formatı: .${ext}`);

    const storedName = `${uuid()}.${ext}`;
    const filePath = path.join(env.UPLOAD_DIR, storedName);

    await writeFile(filePath, file.data);

    const doc = await this.prisma.document.create({
      data: {
        userId,
        originalName: file.filename,
        storedName,
        format: format as any,
        fileSize: file.data.length,
        mimeType: file.mimetype,
        status: "UPLOADED",
      },
    });

    logger.info(`Document uploaded: ${doc.id} (${file.filename})`);
    return doc;
  }

  async list(userId: string, page = 1, limit = 20) {
    const where = { userId, deletedAt: null };
    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      this.prisma.document.count({ where }),
    ]);
    return { documents, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getById(userId: string, docId: string) {
    const doc = await this.prisma.document.findUnique({ where: { id: docId } });
    if (!doc || doc.deletedAt) throw new NotFoundError("Doküman", docId);
    if (doc.userId !== userId) throw new ForbiddenError("Bu dokümana erişim yetkiniz yok");
    return doc;
  }

  async delete(userId: string, docId: string) {
    const doc = await this.getById(userId, docId);
    await this.prisma.document.update({ where: { id: docId }, data: { deletedAt: new Date() } });
    logger.info(`Document deleted: ${docId}`);
    return { success: true };
  }

  async updateStatus(docId: string, status: string, rawText?: string, errorMessage?: string) {
    return this.prisma.document.update({
      where: { id: docId },
      data: { status: status as any, rawText, errorMessage },
    });
  }

  private detectFormat(ext: string, mimetype: string): string | null {
    if (["pdf", "docx", "txt", "tex", "bib", "ris"].includes(ext)) return ext.toUpperCase();
    for (const [mime, exts] of Object.entries(ALLOWED_FORMATS)) {
      if (mime === mimetype && exts.includes(ext)) return ext.toUpperCase();
    }
    return null;
  }
}
