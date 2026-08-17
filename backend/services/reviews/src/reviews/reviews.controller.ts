import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from "@nestjs/swagger";
import { ReviewsService } from "./reviews.service";
import { CreateReviewDto } from "./dto/create-review.dto";
import { UpdateReviewDto } from "./dto/update-review.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@ApiTags("Avaliações")
@Controller("reviews")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @Roles("CLIENT", "PROVIDER")
  @ApiOperation({ summary: "Criar avaliação de pedido concluído e pago" })
  @ApiResponse({ status: 201, description: "Avaliação criada com sucesso" })
  @ApiResponse({ status: 404, description: "Pedido não encontrado" })
  @ApiResponse({
    status: 400,
    description:
      "Pedido não concluído/pago, sem prestador definido ou já avaliado",
  })
  @ApiResponse({
    status: 403,
    description: "Usuário não é parte do pedido",
  })
  async create(@Request() req: any, @Body() dto: CreateReviewDto) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.reviewsService.create(userId, dto, ip);
  }

  @Get("me")
  @Roles("CLIENT", "PROVIDER")
  @ApiOperation({ summary: "Listar avaliações que eu escrevi" })
  @ApiResponse({
    status: 200,
    description: "Lista de avaliações retornada com sucesso",
  })
  async findMine(@Request() req: any) {
    return this.reviewsService.findMine(req.user.sub);
  }

  @Get("service-order/:orderId")
  @Roles("CLIENT", "PROVIDER")
  @ApiOperation({
    summary: "Listar avaliações de um pedido (apenas partes do pedido)",
  })
  @ApiParam({ name: "orderId", description: "ID do pedido" })
  @ApiResponse({
    status: 200,
    description: "Lista de avaliações do pedido retornada com sucesso",
  })
  @ApiResponse({ status: 404, description: "Pedido não encontrado" })
  @ApiResponse({
    status: 403,
    description: "Usuário não é parte do pedido",
  })
  async findByOrder(@Request() req: any, @Param("orderId") orderId: string) {
    return this.reviewsService.findByOrder(orderId, req.user.sub);
  }

  @Patch(":reviewId")
  @Roles("CLIENT", "PROVIDER")
  @ApiOperation({
    summary: "Editar avaliação própria (apenas nos primeiros 5 minutos)",
  })
  @ApiParam({ name: "reviewId", description: "ID da avaliação" })
  @ApiResponse({
    status: 200,
    description: "Avaliação atualizada com sucesso",
  })
  @ApiResponse({ status: 404, description: "Avaliação não encontrada" })
  @ApiResponse({
    status: 403,
    description: "Usuário não é o autor da avaliação",
  })
  @ApiResponse({
    status: 400,
    description: "Janela de edição expirada ou nenhum campo informado",
  })
  async update(
    @Request() req: any,
    @Param("reviewId") reviewId: string,
    @Body() dto: UpdateReviewDto,
  ) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.reviewsService.update(userId, reviewId, dto, ip);
  }

  @Delete(":reviewId")
  @Roles("CLIENT", "PROVIDER")
  @ApiOperation({ summary: "Excluir avaliação própria" })
  @ApiParam({ name: "reviewId", description: "ID da avaliação" })
  @ApiResponse({
    status: 200,
    description: "Avaliação excluída com sucesso",
  })
  @ApiResponse({ status: 404, description: "Avaliação não encontrada" })
  @ApiResponse({
    status: 403,
    description: "Usuário não é o autor da avaliação",
  })
  async remove(@Request() req: any, @Param("reviewId") reviewId: string) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.reviewsService.remove(userId, reviewId, ip);
  }
}

@ApiTags("Avaliações")
@Controller("reviews/provider/:providerId")
export class PublicReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiOperation({ summary: "Listar avaliações de um prestador (público)" })
  @ApiParam({ name: "providerId", description: "ID do prestador" })
  @ApiResponse({
    status: 200,
    description: "Lista de avaliações do prestador retornada com sucesso",
  })
  async findByProvider(@Param("providerId") providerId: string) {
    return this.reviewsService.findByProvider(providerId);
  }
}
