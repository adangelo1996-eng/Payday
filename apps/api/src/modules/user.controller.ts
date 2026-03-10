import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { IsIn, IsString } from "class-validator";
import { CurrentAuth, RequireRole, RoleGuard } from "./auth";
import { HrDataStore } from "./hr-data.store";

class AssignRoleDto {
  @IsString()
  userId!: string;

  @IsIn(["admin", "manager_controllo_gestione", "employee"])
  role!: "admin" | "manager_controllo_gestione" | "employee";
}

@Controller("users")
export class UserController {
  constructor(private readonly store: HrDataStore) {}

  @Get("me")
  async me(@CurrentAuth() auth: { userId: string }): Promise<unknown> {
    return this.store.getUser(auth.userId);
  }

  @Get("roles")
  @UseGuards(RoleGuard)
  @RequireRole("admin")
  roles(): unknown {
    return this.store.listRoles();
  }

  @Patch("assign-role")
  @UseGuards(RoleGuard)
  @RequireRole("admin")
  async assignRole(@Body() dto: AssignRoleDto): Promise<unknown> {
    return this.store.assignRole(dto.userId, dto.role);
  }
}
