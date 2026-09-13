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
  ParseUUIDPipe,
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
import { JwtAuthGuard, RolesGuard, Roles } from "@pode-deixar/security";

@ApiTags("Provider Services")
@Controller("providers/me/services")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProviderServicesController {
  constructor(
    private readonly providerServicesService: ProviderServicesService,
  ) {}

  @Post()
  @Roles("PROVIDER")
  @ApiOperation({ summary: "Register a new service (providers only)" })
  @ApiResponse({ status: 201, description: "Service created successfully" })
  @ApiResponse({
    status: 404,
    description: "Provider profile not found",
  })
  async createService(
    @Request() req: any,
    @Body() dto: CreateProviderServiceDto,
  ): Promise<any> {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.providerServicesService.createServiceForUser(userId, dto, ip);
  }

  @Get()
  @Roles("PROVIDER")
  @ApiOperation({ summary: "List my services (providers only)" })
  @ApiResponse({
    status: 200,
    description: "Service list returned successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Provider profile not found",
  })
  async getMyServices(@Request() req: any): Promise<any> {
    const userId = req.user.sub;
    return this.providerServicesService.getMyServicesForUser(userId);
  }
}

@ApiTags("Provider Search")
@Controller("providers/search")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles("CLIENT")
export class ProviderSearchController {
  constructor(
    private readonly providerServicesService: ProviderServicesService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Search providers by category or text" })
  @ApiQuery({
    name: "categoryId",
    required: false,
    description: "Filter by category ID",
    example: "uuid-da-categoria",
  })
  @ApiQuery({
    name: "q",
    required: false,
    description: "Text to search in service title or description",
    example: "chuveiro",
  })
  @ApiResponse({
    status: 200,
    description: "List of matching providers with their services",
  })
  async searchProviders(@Query() query: SearchProvidersQueryDto) {
    return this.providerServicesService.searchProviders(query);
  }
}

@ApiTags("Provider Services (Public)")
@Controller("providers/:providerId/services")
@ApiBearerAuth()
export class PublicProviderServicesController {
  constructor(
    private readonly providerServicesService: ProviderServicesService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List public services of a provider" })
  @ApiParam({ name: "providerId", description: "Provider profile ID" })
  @ApiResponse({
    status: 200,
    description: "Active service list returned successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Provider profile not found",
  })
  async getProviderServices(
    @Param("providerId", ParseUUIDPipe) providerProfileId: string,
  ): Promise<any> {
    return this.providerServicesService.getProviderServices(providerProfileId);
  }
}

@ApiTags("Provider Services (Owner)")
@Controller("providers/me/services/:serviceId")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProviderServiceDetailController {
  constructor(
    private readonly providerServicesService: ProviderServicesService,
  ) {}

  @Patch()
  @Roles("PROVIDER")
  @ApiOperation({ summary: "Update service (owner only)" })
  @ApiResponse({ status: 200, description: "Service updated successfully" })
  @ApiResponse({ status: 404, description: "Service not found" })
  @ApiResponse({
    status: 400,
    description: "Service does not belong to this provider",
  })
  async updateService(
    @Request() req: any,
    @Param("serviceId", ParseUUIDPipe) serviceId: string,
    @Body() dto: UpdateProviderServiceDto,
  ) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.providerServicesService.updateServiceForUser(
      userId,
      serviceId,
      dto,
      ip,
    );
  }

  @Delete()
  @Roles("PROVIDER")
  @ApiOperation({ summary: "Deactivate service (soft delete, owner only)" })
  @ApiResponse({ status: 200, description: "Service deactivated successfully" })
  @ApiResponse({ status: 404, description: "Service not found" })
  @ApiResponse({
    status: 400,
    description: "Service does not belong to this provider",
  })
  async deleteService(
    @Request() req: any,
    @Param("serviceId", ParseUUIDPipe) serviceId: string,
  ) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.providerServicesService.deleteServiceForUser(
      userId,
      serviceId,
      ip,
    );
  }
}
