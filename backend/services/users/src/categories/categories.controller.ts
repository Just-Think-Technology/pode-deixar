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
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@ApiTags("Categorias")
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: "Listar todas as categorias" })
  @ApiResponse({
    status: 200,
    description: "Lista de categorias retornada com sucesso",
  })
  async findAll() {
    return this.categoriesService.findAll();
  }
}

@ApiTags("Categorias (Admin)")
@Controller("categories")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @Roles("ADMIN")
  @ApiOperation({ summary: "Criar nova categoria (apenas admin)" })
  @ApiResponse({ status: 201, description: "Categoria criada com sucesso" })
  @ApiResponse({
    status: 409,
    description: "Já existe categoria com este nome ou slug",
  })
  async create(@Request() req: any, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto, req.ip);
  }

  @Patch(":id")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Atualizar categoria (apenas admin)" })
  @ApiResponse({ status: 200, description: "Categoria atualizada com sucesso" })
  @ApiResponse({ status: 404, description: "Categoria não encontrada" })
  @ApiResponse({ status: 409, description: "Conflito de nome ou slug" })
  async update(
    @Request() req: any,
    @Param("id") id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, dto, req.ip);
  }

  @Delete(":id")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Excluir categoria (apenas admin)" })
  @ApiResponse({ status: 200, description: "Categoria excluída com sucesso" })
  @ApiResponse({ status: 404, description: "Categoria não encontrada" })
  @ApiResponse({
    status: 409,
    description: "Categoria possui serviços vinculados",
  })
  async remove(@Request() req: any, @Param("id") id: string) {
    await this.categoriesService.remove(id, req.ip);
    return { message: "Categoria excluída com sucesso" };
  }
}
