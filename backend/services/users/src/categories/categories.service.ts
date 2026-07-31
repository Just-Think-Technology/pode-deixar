import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UsersLoggerService } from "../shared/users-logger.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";

@Injectable()
export class CategoriesService {
  constructor(
    private prisma: PrismaService,
    private usersLogger: UsersLoggerService,
  ) {}

  async findAll() {
    const categories = await this.prisma.category.findMany({
      orderBy: { serviceOrders: { _count: "desc" } },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
        order: true,
      },
    });
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      icon: c.icon,
      order: c.order,
    }));
  }

  async create(dto: CreateCategoryDto, ip: string) {
    const existing = await this.prisma.category.findFirst({
      where: { OR: [{ name: dto.name }, { slug: dto.slug }] },
    });
    if (existing) {
      throw new ConflictException(
        existing.name === dto.name
          ? "Já existe uma categoria com este nome"
          : "Já existe uma categoria com este slug",
      );
    }

    const category = await this.prisma.category.create({ data: dto });
    this.usersLogger.logCategoryCreated(category.name, ip);
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto, ip: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException("Categoria não encontrada");
    }

    if (dto.name) {
      const conflict = await this.prisma.category.findFirst({
        where: { name: dto.name, id: { not: id } },
      });
      if (conflict) {
        throw new ConflictException("Já existe uma categoria com este nome");
      }
    }
    if (dto.slug) {
      const conflict = await this.prisma.category.findFirst({
        where: { slug: dto.slug, id: { not: id } },
      });
      if (conflict) {
        throw new ConflictException("Já existe uma categoria com este slug");
      }
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: dto,
    });
    this.usersLogger.logCategoryUpdated(updated.name, ip);
    return updated;
  }

  async remove(id: string, ip: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException("Categoria não encontrada");
    }

    await this.prisma.category.delete({ where: { id } });
    this.usersLogger.logCategoryDeleted(category.name, ip);
  }
}
