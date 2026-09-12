import { Injectable } from "@nestjs/common";
import { PrismaService } from "@pode-deixar/prisma";

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllCategories() {
    return this.prisma.category.findMany({
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
  }

  findConflictingCategory(name: string, slug: string) {
    return this.prisma.category.findFirst({
      where: { OR: [{ name }, { slug }] },
    });
  }

  createCategory(data: any) {
    return this.prisma.category.create({ data });
  }

  findCategoryById(id: string) {
    return this.prisma.category.findUnique({ where: { id } });
  }

  findCategoryByNameExcludingId(name: string, id: string) {
    return this.prisma.category.findFirst({
      where: { name, id: { not: id } },
    });
  }

  findCategoryBySlugExcludingId(slug: string, id: string) {
    return this.prisma.category.findFirst({
      where: { slug, id: { not: id } },
    });
  }

  updateCategory(id: string, data: any) {
    return this.prisma.category.update({ where: { id }, data });
  }

  deleteCategory(id: string) {
    return this.prisma.category.delete({ where: { id } });
  }
}
