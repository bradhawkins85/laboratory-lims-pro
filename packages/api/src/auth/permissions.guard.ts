import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { PERMISSION_KEY, PermissionMetadata } from './permissions.decorator';
import { can } from './permissions.helper';
import { PermissionContext, PermissionUser } from './permissions.types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissionMetadata =
      this.reflector.getAllAndOverride<PermissionMetadata>(PERMISSION_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    // If no permission metadata, allow access (other guards will handle auth)
    if (!permissionMetadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: PermissionUser = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const { action, resource, checkContext } = permissionMetadata;

    // If context checking is not required, just check role-level permissions
    if (!checkContext) {
      const result = can(user, action, resource);

      if (!result.allowed) {
        throw new ForbiddenException(
          result.reason || 'Insufficient permissions',
        );
      }

      return true;
    }

    // For context-based checks, we need to fetch the resource
    const permissionContext = await this.getPermissionContext(
      request,
      resource,
    );

    const result = can(user, action, resource, permissionContext);

    if (!result.allowed) {
      throw new ForbiddenException(result.reason || 'Insufficient permissions');
    }

    return true;
  }

  /**
   * Get permission context from the request
   * This extracts the resource ID from the request and fetches necessary fields
   */
  private async getPermissionContext(
    request: any,
    resource: string,
  ): Promise<PermissionContext> {
    const resourceId =
      request.params.id ||
      request.params.sampleId ||
      request.params.testId ||
      request.params.reportId;

    if (!resourceId) {
      // No specific resource ID, return empty context
      return {};
    }

    try {
      switch (resource) {
        case 'SAMPLE': {
          const sample = await this.prisma.sample.findUnique({
            where: { id: resourceId },
            select: {
              id: true,
              createdById: true,
              clientId: true,
              released: true,
            },
          });

          if (!sample) {
            throw new NotFoundException('Sample not found');
          }

          return {
            ownerId: sample.createdById,
            assignedUserId: undefined, // No longer tracking assigned user at sample level
            clientId: sample.clientId || undefined,
            status: sample.released ? 'COMPLETED' : 'IN_PROGRESS',
          };
        }

        case 'TEST': {
          const testAssignment = await this.prisma.testAssignment.findUnique({
            where: { id: resourceId },
            include: {
              sample: {
                select: {
                  clientId: true,
                },
              },
            },
          });

          if (!testAssignment) {
            throw new NotFoundException('Test not found');
          }

          return {
            ownerId: testAssignment.createdById,
            assignedUserId: testAssignment.analystId || undefined,
            clientId: testAssignment.sample.clientId || undefined,
            status: testAssignment.status,
          };
        }

        case 'REPORT': {
          const report = await this.prisma.cOAReport.findUnique({
            where: { id: resourceId },
            include: {
              sample: {
                select: {
                  clientId: true,
                },
              },
            },
          });

          if (!report) {
            throw new NotFoundException('Report not found');
          }

          return {
            ownerId: report.createdById,
            clientId: report.sample.clientId || undefined,
            status: report.status,
          };
        }

        default:
          return {};
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      // If we can't fetch the resource, deny access
      throw new ForbiddenException('Unable to verify permissions');
    }
  }
}
