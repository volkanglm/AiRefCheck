/**
 * AiRefCheck - Settings Routes
 * API key configuration and user settings.
 */

import { FastifyInstance } from "fastify";
import { authMiddleware } from "../../middleware/auth";
import { z } from "zod";

// API key names that can be configured by users
const API_KEY_CONFIG = [
  {
    key: "CROSSREF_MAILTO",
    label: "CrossRef E-posta",
    description: "CrossRef API için e-posta adresiniz (ücretsiz, daha hızlı erişim sağlar)",
    placeholder: "ornek@email.com",
    required: false,
    guideUrl: "https://github.com/CrossRef/rest-api-doc#good-manners--api-etiquette",
    guideText: "Herhangi bir e-posta adresi verebilirsiniz. API anahtarı gerekmez, sadece rate limit artar.",
  },
  {
    key: "SEMANTIC_SCHOLAR_API_KEY",
    label: "Semantic Scholar API Anahtarı",
    description: "Semantic Scholar akademik arama motoru API anahtarı",
    placeholder: "s2k-xxxx...",
    required: false,
    guideUrl: "https://www.semanticscholar.org/product/api#api-key",
    guideText: "Ücretsiz API anahtarı. https://www.semanticscholar.org/product/api adresinden başvurun. Saniyede 1 istek limiti vardır.",
  },
  {
    key: "PUBMED_API_KEY",
    label: "PubMed / NCBI API Anahtarı",
    description: "PubMed biyomedikal literatür veritabanı API anahtarı",
    placeholder: "xxxxxx...",
    required: false,
    guideUrl: "https://www.ncbi.nlm.nih.gov/account/settings/",
    guideText: "NCBI hesabı oluşturun → Settings → API Key Management → 'Create an API Key'. Saniyede 3→10 isteğe çıkarsınız.",
  },
  {
    key: "OPENALEX_MAILTO",
    label: "OpenAlex E-posta",
    description: "OpenAlex akademik veritabanı için e-posta (ücretsiz, daha hızlı erişim)",
    placeholder: "ornek@email.com",
    required: false,
    guideUrl: "https://docs.openalex.org/how-to-use-the-api/getting-started",
    guideText: "E-posta adresinizi API isteğinde parametre olarak gönderiyoruz. API anahtarı gerekmez, pool'a dahil olursunuz.",
  },
  {
    key: "SPRINGER_API_KEY",
    label: "Springer Metadata API Anahtarı",
    description: "Springer bilimsel yayınevi API anahtarı (5M+ makale, kitap, bölüm)",
    placeholder: "xxxxxxxxxxxx...",
    required: false,
    guideUrl: "https://dev.springernature.com/",
    guideText: "Ücretsiz API anahtarı. https://dev.springernature.com/ adresinden kayıt olun. Dakikada 100 istek limiti.",
  },
  {
    key: "PLOS_API_KEY",
    label: "PLoS Search API Anahtarı",
    description: "PLOS (Public Library of Science) biyoloji ve tıp dergileri API anahtarı",
    placeholder: "xxxxxxxxxxxx...",
    required: false,
    guideUrl: "https://api.plos.org/",
    guideText: "Ücretsiz API anahtarı. https://api.plos.org/ adresinden kayıt olun. Dakikada 10 istek limiti.",
  },
];

export async function settingsRoutes(fastify: FastifyInstance) {
  // Get current API key status (masked)
  fastify.get("/api-keys", {
    preHandler: [authMiddleware],
    handler: async (request, reply) => {
      const keys = API_KEY_CONFIG.map((cfg) => {
        const envValue = process.env[cfg.key] || "";
        return {
          ...cfg,
          isSet: envValue.length > 0,
          // Mask the value for security
          maskedValue: envValue ? envValue.substring(0, 4) + "****" + envValue.substring(envValue.length - 4) : "",
        };
      });
      return reply.send({ success: true, data: keys });
    },
  });

  // Get API key configuration guide
  fastify.get("/api-guide", {
    preHandler: [authMiddleware],
    handler: async () => {
      return {
        success: true,
        data: {
          title: "API Anahtarları Nasıl Alınır?",
          intro: "AiRefCheck tamamen ücretsiz ve açık kaynaklıdır. Referans doğrulama için aşağıdaki akademik veritabanlarının API'lerini kullanır. Kendi API anahtarlarınızı almanız önerilir.",
          steps: API_KEY_CONFIG.map((cfg) => ({
            name: cfg.label,
            description: cfg.description,
            howToGet: cfg.guideText,
            link: cfg.guideUrl,
            required: cfg.required,
          })),
          note: "API anahtarı olmadan da uygulama çalışır, ancak istek limitleri daha düşük olur. Tüm API'ler ücretsizdir.",
        },
      };
    },
  });

  // Update API keys (writes to .env file or environment)
  const updateSchema = z.object({
    keys: z.record(z.string()),
  });

  fastify.post("/api-keys", {
    preHandler: [authMiddleware],
    handler: async (request, reply) => {
      const { keys } = updateSchema.parse(request.body);

      // Update environment variables at runtime
      for (const [key, value] of Object.entries(keys)) {
        if (value && value.trim()) {
          process.env[key] = value.trim();
        }
      }

      return reply.send({ success: true, message: "API anahtarları güncellendi. Değişiklikler hemen geçerlidir." });
    },
  });
}
