import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { IsDateString, IsString } from "class-validator";
import { CurrentAuth, RequireRole, RoleGuard } from "./auth";
import { HrDataStore } from "./hr-data.store";

class LeaveDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}

@Controller("leave")
export class LeaveController {
  constructor(private readonly store: HrDataStore) {}

  @Post("plan")
  async create(@CurrentAuth() auth: { userId: string }, @Body() dto: LeaveDto): Promise<unknown> {
    return this.store.createLeavePlan({
      userId: auth.userId,
      startDate: dto.startDate,
      endDate: dto.endDate
    });
  }

  @Patch("plan/:leaveId")
  async update(
    @Param("leaveId") leaveId: string,
    @Body() dto: LeaveDto
  ): Promise<unknown> {
    return this.store.updateLeavePlan(leaveId, dto.startDate, dto.endDate);
  }

  @Patch("approve/:leaveId")
  @UseGuards(RoleGuard)
  @RequireRole("manager_controllo_gestione")
  async approve(@Param("leaveId") leaveId: string, @CurrentAuth() auth: { userId: string }): Promise<unknown> {
    const leave = await this.store.getLeave(leaveId);
    if (!(await this.store.isManagerOf(auth.userId, leave.userId))) {
      throw new ForbiddenException("Manager non autorizzato per questo dipendente");
    }
    return this.store.approveLeave(leaveId, auth.userId);
  }

  @Get("plan")
  async list(@CurrentAuth() auth: { userId: string }): Promise<unknown> {
    return this.store.listLeave(auth.userId);
  }
}
