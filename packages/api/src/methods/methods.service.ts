import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateMethodDto {
  code: string;
  name: string;
  description?: string;
  unit?: string;
  lod?: number;
  loq?: number;
}

export interface UpdateMethodDto {
  code?: string;
  name?: string;
  description?: string;
  unit?: string;
  lod?: number;
  loq?: number;
}

export interface AuditContext {
  actorId: string;
  actorEmail: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class MethodsService {
  constructor(private prisma: PrismaService) {}

  async createMethod(dto: CreateMethodDto, context: AuditContext) {
    const method = await this.prisma.method.create({
      data: {
        ...dto,
        createdById: context.actorId,
        updatedById: context.actorId,
      },
    });

    return method;
  }

  async listMethods(filters?: {
    code?: string;
    name?: string;
    page?: number;
    perPage?: number;
  }) {
    const page = filters?.page || 1;
    const perPage = filters?.perPage || 50;
    const skip = (page - 1) * perPage;

    const where: any = {};
    if (filters?.code) {
      where.code = { contains: filters.code, mode: 'insensitive' };
    }
    if (filters?.name) {
      where.name = { contains: filters.name, mode: 'insensitive' };
    }

    const [methods, total] = await Promise.all([
      this.prisma.method.findMany({
        where,
        skip,
        take: perPage,
        include: {
          createdBy: {
            select: { id: true, email: true, name: true },
          },
          updatedBy: {
            select: { id: true, email: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.method.count({ where }),
    ]);

    return {
      data: methods,
      pagination: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async getMethod(id: string) {
    const method = await this.prisma.method.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, email: true, name: true },
        },
        updatedBy: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (!method) {
      throw new NotFoundException(`Method with ID ${id} not found`);
    }

    return method;
  }

  async updateMethod(id: string, dto: UpdateMethodDto, context: AuditContext) {
    const existingMethod = await this.prisma.method.findUnique({
      where: { id },
    });

    if (!existingMethod) {
      throw new NotFoundException(`Method with ID ${id} not found`);
    }

    const method = await this.prisma.method.update({
      where: { id },
      data: {
        ...dto,
        updatedById: context.actorId,
      },
      include: {
        createdBy: {
          select: { id: true, email: true, name: true },
        },
        updatedBy: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    return method;
  }

  async deleteMethod(id: string, context: AuditContext) {
    const method = await this.prisma.method.findUnique({
      where: { id },
    });

    if (!method) {
      throw new NotFoundException(`Method with ID ${id} not found`);
    }

    await this.prisma.method.delete({
      where: { id },
    });

    return { message: 'Method deleted successfully' };
  }
}
