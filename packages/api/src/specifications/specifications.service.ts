import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateSpecificationDto {
  code: string;
  name: string;
  target?: string;
  min?: number;
  max?: number;
  unit?: string;
  oosRule?: string;
}

export interface UpdateSpecificationDto {
  code?: string;
  name?: string;
  target?: string;
  min?: number;
  max?: number;
  unit?: string;
  oosRule?: string;
}

export interface AuditContext {
  actorId: string;
  actorEmail: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class SpecificationsService {
  constructor(private prisma: PrismaService) {}

  async createSpecification(
    dto: CreateSpecificationDto,
    context: AuditContext,
  ) {
    const specification = await this.prisma.specification.create({
      data: {
        ...dto,
        createdById: context.actorId,
        updatedById: context.actorId,
      },
    });

    return specification;
  }

  async listSpecifications(filters?: {
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

    const [specifications, total] = await Promise.all([
      this.prisma.specification.findMany({
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
      this.prisma.specification.count({ where }),
    ]);

    return {
      data: specifications,
      pagination: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async getSpecification(id: string) {
    const specification = await this.prisma.specification.findUnique({
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

    if (!specification) {
      throw new NotFoundException(`Specification with ID ${id} not found`);
    }

    return specification;
  }

  async updateSpecification(
    id: string,
    dto: UpdateSpecificationDto,
    context: AuditContext,
  ) {
    const existingSpecification = await this.prisma.specification.findUnique({
      where: { id },
    });

    if (!existingSpecification) {
      throw new NotFoundException(`Specification with ID ${id} not found`);
    }

    const specification = await this.prisma.specification.update({
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

    return specification;
  }

  async deleteSpecification(id: string, context: AuditContext) {
    const specification = await this.prisma.specification.findUnique({
      where: { id },
    });

    if (!specification) {
      throw new NotFoundException(`Specification with ID ${id} not found`);
    }

    await this.prisma.specification.delete({
      where: { id },
    });

    return { message: 'Specification deleted successfully' };
  }
}
