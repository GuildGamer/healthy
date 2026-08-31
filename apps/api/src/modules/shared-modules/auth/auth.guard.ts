import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { fromNodeHeaders } from 'better-auth/node';
import {
  adminCanManageAdmins,
  adminHasPermission,
  type AdminRoleName,
} from '@product/contract';
import type { PrismaClient } from '@product/db';
import { PRISMA } from '../database/prisma.tokens.js';
import type { AuthenticatedAdmin } from '../../../shared/types/authenticated-admin.js';
import { adminAuth } from './admin-auth.js';
import { ADMIN_AUTH_KEY, type AdminRoleRequirement } from './admin.decorators.js';
import { auth } from './auth.js';

type AuthedRequest = {
  headers: Record<string, string | string[] | undefined>;
  user?: unknown;
  session?: unknown;
  admin?: AuthenticatedAdmin | null;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(PRISMA) private readonly prisma: PrismaClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const adminRequirement = this.reflector.getAllAndOverride<
      AdminRoleRequirement | undefined
    >(ADMIN_AUTH_KEY, [context.getHandler(), context.getClass()]);

    const request = context.switchToHttp().getRequest<AuthedRequest>();

    if (adminRequirement) {
      return this.activateAdmin(request, adminRequirement);
    }

    return this.activateMember(context, request);
  }

  private async activateAdmin(
    request: AuthedRequest,
    requirement: AdminRoleRequirement,
  ): Promise<boolean> {
    const session = await adminAuth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session) {
      throw new UnauthorizedException('Authentication required');
    }

    const record = await this.prisma.adminUser.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        roles: { select: { role: true } },
      },
    });

    if (!record || !record.isActive) {
      throw new UnauthorizedException('Authentication required');
    }

    const roles = record.roles.map((assignment) => assignment.role);
    const admin: AuthenticatedAdmin = {
      id: record.id,
      email: record.email,
      name: record.name,
      roles,
      isActive: record.isActive,
    };

    if (!this.satisfies(roles, requirement)) {
      throw new ForbiddenException('You do not have permission to do that');
    }

    request.admin = admin;
    request.user = null;
    request.session = session.session;
    return true;
  }

  private satisfies(
    roles: AdminRoleName[],
    requirement: AdminRoleRequirement,
  ): boolean {
    if (requirement === 'any') {
      return roles.length > 0;
    }

    if (requirement === 'superadmin') {
      return adminCanManageAdmins(roles);
    }

    return adminHasPermission(roles, requirement);
  }

  private async activateMember(
    context: ExecutionContext,
    request: AuthedRequest,
  ): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('PUBLIC', [
      context.getHandler(),
      context.getClass(),
    ]);

    const isOptional = this.reflector.getAllAndOverride<boolean>('OPTIONAL', [
      context.getHandler(),
      context.getClass(),
    ]);

    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (session) {
      const profile = await this.prisma.userProfile.findUnique({
        where: { userId: session.user.id },
        select: { deactivatedAt: true },
      });

      if (profile?.deactivatedAt) {
        if (isPublic || isOptional) {
          return true;
        }

        throw new UnauthorizedException('Authentication required');
      }

      request.user = session.user;
      request.session = session.session;
      return true;
    }

    if (isPublic || isOptional) {
      return true;
    }

    throw new UnauthorizedException('Authentication required');
  }
}
