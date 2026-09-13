// Categories controller — public listing and admin management

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { JwtAuthGuard, RolesGuard, Roles } from "@pode-deixar/security";

@ApiTags("Categories")
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // --- Public API ---

  @Get()
  @ApiOperation({ summary: "List all categories" })
  @ApiResponse({
    status: 200,
    description: "Category list returned successfully",
  })
  async findAll(): Promise<
    {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      icon: string | null;
      order: number;
    }[]
  > {
    return this.categoriesService.findAll();
  }
}

@ApiTags("Categories (Admin)")
@Controller("categories")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // --- Public API ---

  @Post()
  @Roles("ADMIN")
  @ApiOperation({ summary: "Create new category (admin only)" })
  @ApiResponse({ status: 201, description: "Category created successfully" })
  @ApiResponse({
    status: 409,
    description: "A category with this name or slug already exists",
  })
  async create(
    @Request() req: any,
    @Body() dto: CreateCategoryDto,
  ): Promise<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    icon: string | null;
    order: number;
  }> {
    return this.categoriesService.create(dto, req.ip);
  }

  @Patch(":id")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Update category (admin only)" })
  @ApiResponse({ status: 200, description: "Category updated successfully" })
  @ApiResponse({ status: 404, description: "Category not found" })
  @ApiResponse({ status: 409, description: "Name or slug conflict" })
  async update(
    @Request() req: any,
    @Param("id") id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    icon: string | null;
    order: number;
  }> {
    return this.categoriesService.update(id, dto, req.ip);
  }

  @Delete(":id")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Delete category (admin only)" })
  @ApiResponse({ status: 200, description: "Category deleted successfully" })
  @ApiResponse({ status: 404, description: "Category not found" })
  @ApiResponse({
    status: 409,
    description: "Category has linked services",
  })
  async remove(@Request() req: any, @Param("id") id: string) {
    await this.categoriesService.remove(id, req.ip);
    return { message: "Categoria excluída com sucesso" };
  }
}
