import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { CategoriesRepository } from "./categories.repository";
import { UsersLoggerService } from "../shared/users-logger.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";

@Injectable()
export class CategoriesService {
  constructor(
    private repository: CategoriesRepository,
    private usersLogger: UsersLoggerService,
  ) {}

  async findAll() {
    const categories = await this.repository.findAllCategories();
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
    const existing = await this.repository.findConflictingCategory(
      dto.name,
      dto.slug,
    );
    if (existing) {
      throw new ConflictException(
        existing.name === dto.name
          ? "Já existe uma categoria com este nome"
          : "Já existe uma categoria com este slug",
      );
    }

    const category = await this.repository.createCategory(dto);
    this.usersLogger.logCategoryCreated(category.name, ip);
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto, ip: string) {
    const category = await this.repository.findCategoryById(id);
    if (!category) {
      throw new NotFoundException("Categoria não encontrada");
    }

    if (dto.name) {
      const conflict = await this.repository.findCategoryByNameExcludingId(
        dto.name,
        id,
      );
      if (conflict) {
        throw new ConflictException("Já existe uma categoria com este nome");
      }
    }
    if (dto.slug) {
      const conflict = await this.repository.findCategoryBySlugExcludingId(
        dto.slug,
        id,
      );
      if (conflict) {
        throw new ConflictException("Já existe uma categoria com este slug");
      }
    }

    const updated = await this.repository.updateCategory(id, dto);
    this.usersLogger.logCategoryUpdated(updated.name, ip);
    return updated;
  }

  async remove(id: string, ip: string) {
    const category = await this.repository.findCategoryById(id);
    if (!category) {
      throw new NotFoundException("Categoria não encontrada");
    }

    await this.repository.deleteCategory(id);
    this.usersLogger.logCategoryDeleted(category.name, ip);
  }
}
