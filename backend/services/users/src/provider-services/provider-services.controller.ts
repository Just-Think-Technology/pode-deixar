import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { ProviderServicesService } from "./provider-services.service";
import { CreateProviderServiceDto } from "./dto/create-provider-service.dto";
import { UpdateProviderServiceDto } from "./dto/update-provider-service.dto";
import { SearchProvidersQueryDto } from "./dto/search-providers-query.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@ApiTags("Serviços do Prestador")
@Controller("providers/me/services")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProviderServicesController {
  constructor(
    private readonly providerServicesService: ProviderServicesService,
  ) {}

  @Post()
  @Roles("PROVIDER")
  @ApiOperation({ summary: "Cadastrar novo serviço (apenas prestadores)" })
  @ApiResponse({ status: 201, description: "Serviço criado com sucesso" })
  @ApiResponse({
    status: 404,
    description: "Perfil de prestador não encontrado",
  })
  async createService(
    @Request() req: any,
    @Body() dto: CreateProviderServiceDto,
  ) {
    const userId = req.user.sub;
    const ip = req.ip;
    const profile =
      await this.providerServicesService.getProviderProfileByUserId(userId);
    return this.providerServicesService.createService(profile.id, dto, ip);
  }

  @Get()
  @Roles("PROVIDER")
  @ApiOperation({ summary: "Listar meus serviços (apenas prestadores)" })
  @ApiResponse({
    status: 200,
    description: "Lista de serviços retornada com sucesso",
  })
  @ApiResponse({
    status: 404,
    description: "Perfil de prestador não encontrado",
  })
  async getMyServices(@Request() req: any) {
    const userId = req.user.sub;
    const profile =
      await this.providerServicesService.getProviderProfileByUserId(userId);
    return this.providerServicesService.getMyServices(profile.id);
  }
}

@ApiTags("Busca de Prestadores")
@Controller("providers/search")
export class ProviderSearchController {
  constructor(
    private readonly providerServicesService: ProviderServicesService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Buscar prestadores por categoria ou texto" })
  @ApiQuery({
    name: "category",
    required: false,
    description: "Filtrar por categoria do serviço",
    example: "ELETRICA",
  })
  @ApiQuery({
    name: "q",
    required: false,
    description: "Texto para buscar no título ou descrição do serviço",
    example: "chuveiro",
  })
  @ApiResponse({
    status: 200,
    description: "Lista de prestadores encontrados com seus serviços",
  })
  async searchProviders(@Query() query: SearchProvidersQueryDto) {
    return this.providerServicesService.searchProviders(query);
  }
}

@ApiTags("Serviços do Prestador (Público)")
@Controller("providers/:providerId/services")
@ApiBearerAuth()
export class PublicProviderServicesController {
  constructor(
    private readonly providerServicesService: ProviderServicesService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Listar serviços públicos de um prestador" })
  @ApiParam({ name: "providerId", description: "ID do perfil do prestador" })
  @ApiResponse({
    status: 200,
    description: "Lista de serviços ativos retornada com sucesso",
  })
  @ApiResponse({
    status: 404,
    description: "Perfil de prestador não encontrado",
  })
  async getProviderServices(@Param("providerId") providerProfileId: string) {
    return this.providerServicesService.getProviderServices(providerProfileId);
  }
}

@ApiTags("Serviços do Prestador (Dono)")
@Controller("providers/me/services/:serviceId")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProviderServiceDetailController {
  constructor(
    private readonly providerServicesService: ProviderServicesService,
  ) {}

  @Patch()
  @Roles("PROVIDER")
  @ApiOperation({ summary: "Atualizar serviço (apenas dono)" })
  @ApiResponse({ status: 200, description: "Serviço atualizado com sucesso" })
  @ApiResponse({ status: 404, description: "Serviço não encontrado" })
  @ApiResponse({
    status: 400,
    description: "Serviço não pertence a este prestador",
  })
  async updateService(
    @Request() req: any,
    @Param("serviceId") serviceId: string,
    @Body() dto: UpdateProviderServiceDto,
  ) {
    const userId = req.user.sub;
    const ip = req.ip;
    const profile =
      await this.providerServicesService.getProviderProfileByUserId(userId);
    return this.providerServicesService.updateService(
      profile.id,
      serviceId,
      dto,
      ip,
    );
  }

  @Delete()
  @Roles("PROVIDER")
  @ApiOperation({ summary: "Desativar serviço (soft delete, apenas dono)" })
  @ApiResponse({ status: 200, description: "Serviço desativado com sucesso" })
  @ApiResponse({ status: 404, description: "Serviço não encontrado" })
  @ApiResponse({
    status: 400,
    description: "Serviço não pertence a este prestador",
  })
  async deleteService(
    @Request() req: any,
    @Param("serviceId") serviceId: string,
  ) {
    const userId = req.user.sub;
    const ip = req.ip;
    const profile =
      await this.providerServicesService.getProviderProfileByUserId(userId);
    return this.providerServicesService.deleteService(
      profile.id,
      serviceId,
      ip,
    );
  }
}
