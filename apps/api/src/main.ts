import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";

async function bootstrap(): Promise<void> {
  const defaultOrigins = ["http://localhost:3000", "https://payday-web.vercel.app"];
  const corsOrigin = process.env.CORS_ORIGIN ?? defaultOrigins.join(",");
  const origins = corsOrigin
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowedOrigins = origins.length > 0 ? origins : defaultOrigins;

  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: allowedOrigins,
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
