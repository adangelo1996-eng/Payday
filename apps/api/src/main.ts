import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";

function debugAgentLog(
  hypothesisId: "H1" | "H2" | "H3" | "H4" | "H5",
  location: string,
  message: string,
  data: Record<string, unknown>
): void {
  // #region agent log
  fetch("http://127.0.0.1:7610/ingest/da1f9aea-fe4e-4a64-8920-44501363a538", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ad76a1" },
    body: JSON.stringify({
      sessionId: "ad76a1",
      runId: "run1",
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now()
    })
  }).catch(() => {});
  // #endregion
}

async function bootstrap(): Promise<void> {
  const defaultOrigins = [
    "http://localhost:3000",
    "https://payday-web.vercel.app",
    "https://payday-azi-rfmn.onrender.com"
  ];
  const corsOrigin = process.env.CORS_ORIGIN ?? defaultOrigins.join(",");
  const origins = corsOrigin
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowedOrigins = origins.length > 0 ? origins : defaultOrigins;
  debugAgentLog("H2", "apps/api/src/main.ts:35", "Resolved CORS origins", {
    corsOriginEnv: process.env.CORS_ORIGIN ?? null,
    allowedOrigins
  });

  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }
        const isExactMatch = allowedOrigins.includes(origin);
        const isRenderDomain = /^https:\/\/[a-z0-9-]+\.onrender\.com$/i.test(origin);
        const isVercelPreview = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
        const isLocalhost = /^http:\/\/localhost:\d+$/i.test(origin);
        const allowed = isExactMatch || isRenderDomain || isVercelPreview || isLocalhost;
        callback(null, allowed);
      },
      methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Accept", "Authorization"],
      preflightContinue: false,
      optionsSuccessStatus: 204
    }
  });

  const http = app.getHttpAdapter().getInstance();
  http.get("/", (_req: unknown, res: { json: (body: unknown) => void }) => {
    res.json({ status: "ok", service: "payday-api", basePath: "/api" });
  });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
  await app.listen(port, "0.0.0.0");
}

void bootstrap();
