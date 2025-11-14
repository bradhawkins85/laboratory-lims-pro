import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateTestDefinitionDto {
  name: string;
  sectionId: string;
  methodId: string;
  specificationId?: string;
  defaultDueDays?: number;
}

export interface UpdateTestDefinitionDto {
  name?: string;
  sectionId?: string;
  methodId?: string;
  specificationId?: string;
  defaultDueDays?: number;
}

export interface AuditContext {
  actorId: string;
  actorEmail: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class TestDefinitionsService {
  constructor(private prisma: PrismaService) {}

  async createTestDefinition(
    dto: CreateTestDefinitionDto,
    context: AuditContext,
  ) {
    const testDefinition = await this.prisma.testDefinition.create({
      data: {
        name: dto.name,
        sectionId: dto.sectionId,
        methodId: dto.methodId,
        specificationId: dto.specificationId,
        defaultDueDays: dto.defaultDueDays,
        createdById: context.actorId,
        updatedById: context.actorId,
      },
      include: {
        section: true,
        method: true,
        specification: true,
      },
    });

    return testDefinition;
  }

  async listTestDefinitions(filters?: {
    name?: string;
    sectionId?: string;
    page?: number;
    perPage?: number;
  }) {
    const page = filters?.page || 1;
    const perPage = filters?.perPage || 50;
    const skip = (page - 1) * perPage;

    const where: any = {};
    if (filters?.name) {
      where.name = { contains: filters.name, mode: 'insensitive' };
    }
    if (filters?.sectionId) {
      where.sectionId = filters.sectionId;
    }

    const [testDefinitions, total] = await Promise.all([
      this.prisma.testDefinition.findMany({
        where,
        skip,
        take: perPage,
        include: {
          section: true,
          method: true,
          specification: true,
          createdBy: {
            select: { id: true, email: true, name: true },
          },
          updatedBy: {
            select: { id: true, email: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.testDefinition.count({ where }),
    ]);

    return {
      data: testDefinitions,
      pagination: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async getTestDefinition(id: string) {
    const testDefinition = await this.prisma.testDefinition.findUnique({
      where: { id },
      include: {
        section: true,
        method: true,
        specification: true,
        createdBy: {
          select: { id: true, email: true, name: true },
        },
        updatedBy: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (!testDefinition) {
      throw new NotFoundException(`TestDefinition with ID ${id} not found`);
    }

    return testDefinition;
  }

  async updateTestDefinition(
    id: string,
    dto: UpdateTestDefinitionDto,
    context: AuditContext,
  ) {
    const existingTestDefinition =
      await this.prisma.testDefinition.findUnique({
        where: { id },
      });

    if (!existingTestDefinition) {
      throw new NotFoundException(`TestDefinition with ID ${id} not found`);
    }

    const testDefinition = await this.prisma.testDefinition.update({
      where: { id },
      data: {
        ...dto,
        updatedById: context.actorId,
      },
      include: {
        section: true,
        method: true,
        specification: true,
        createdBy: {
          select: { id: true, email: true, name: true },
        },
        updatedBy: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    return testDefinition;
  }

  async deleteTestDefinition(id: string, context: AuditContext) {
    const testDefinition = await this.prisma.testDefinition.findUnique({
      where: { id },
    });

    if (!testDefinition) {
      throw new NotFoundException(`TestDefinition with ID ${id} not found`);
    }

    await this.prisma.testDefinition.delete({
      where: { id },
    });

    return { message: 'TestDefinition deleted successfully' };
  }
}
