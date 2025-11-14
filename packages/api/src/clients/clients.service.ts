import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateClientDto {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface UpdateClientDto {
  name?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface AuditContext {
  actorId: string;
  actorEmail: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async createClient(dto: CreateClientDto, context: AuditContext) {
    const client = await this.prisma.client.create({
      data: {
        name: dto.name,
        contactName: dto.contactName,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        createdById: context.actorId,
        updatedById: context.actorId,
      },
    });

    return client;
  }

  async listClients(filters?: {
    name?: string;
    email?: string;
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
    if (filters?.email) {
      where.email = { contains: filters.email, mode: 'insensitive' };
    }

    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
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
      this.prisma.client.count({ where }),
    ]);

    return {
      data: clients,
      pagination: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async getClient(id: string) {
    const client = await this.prisma.client.findUnique({
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

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    return client;
  }

  async updateClient(id: string, dto: UpdateClientDto, context: AuditContext) {
    const existingClient = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!existingClient) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    const client = await this.prisma.client.update({
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

    return client;
  }

  async deleteClient(id: string, context: AuditContext) {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    await this.prisma.client.delete({
      where: { id },
    });

    return { message: 'Client deleted successfully' };
  }
}
