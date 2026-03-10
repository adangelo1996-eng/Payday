import {
  BadRequestException,
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata
} from "@nestjs/common";
import type { Request } from "express";

export interface AuthContext {
  userId: string;
  role: "admin" | "manager_controllo_gestione" | "employee";
}

export const AUTH_ROLE_KEY = "auth-role";
export const RequireRole = (role: AuthContext["role"]) => SetMetadata(AUTH_ROLE_KEY, role);

export const CurrentAuth = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const userId = request.headers["x-user-id"];
    const role = request.headers["x-role"];

    if (typeof userId !== "string" || typeof role !== "string") {
      throw new BadRequestException("Headers x-user-id e x-role obbligatori");
    }

    if (!["admin", "manager_controllo_gestione", "employee"].includes(role)) {
      throw new BadRequestException("Ruolo non valido");
    }

    return { userId, role: role as AuthContext["role"] };
  }
);

@Injectable()
export class RoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRole = Reflect.getMetadata(AUTH_ROLE_KEY, context.getHandler()) as
      | AuthContext["role"]
      | undefined;
    if (!requiredRole) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    const role = request.headers["x-role"];
    if (role !== requiredRole && role !== "admin") {
      throw new ForbiddenException("Permessi insufficienti");
    }
    return true;
  }
}
