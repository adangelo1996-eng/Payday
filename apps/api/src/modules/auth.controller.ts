import { Body, Controller, Post, Req } from "@nestjs/common";
import { IsEmail, IsString, MinLength } from "class-validator";
import type { Request } from "express";
import { AuthService } from "./auth.service";

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<unknown> {
    // #region agent log
    fetch("http://127.0.0.1:7610/ingest/da1f9aea-fe4e-4a64-8920-44501363a538", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ad76a1" },
      body: JSON.stringify({
        sessionId: "ad76a1",
        runId: "run1",
        hypothesisId: "H4",
        location: "apps/api/src/modules/auth.controller.ts:24",
        message: "Auth login endpoint reached",
        data: {
          originHeader: req.headers.origin ?? null,
          hostHeader: req.headers.host ?? null
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion
    return this.authService.login(dto.email, dto.password);
  }
}
