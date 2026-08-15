import { Controller, Get, Query, UseGuards, Request } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from "@nestjs/swagger";
import { PaymentsService } from "./payments.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { FinanceItemsQueryDto } from "./dto/finance-items-query.dto";
import { FinanceChartQueryDto } from "./dto/finance-chart-query.dto";

@ApiTags("Financeiro do Prestador")
@Controller("payments/provider/me/finance")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProviderFinanceController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get("summary")
  @Roles("PROVIDER")
  @ApiOperation({
    summary: "Resumo financeiro do prestador autenticado",
    description:
      "Totais calculados no backend (fonte da verdade): taxa da plataforma, líquido a receber, pendente e recebido no mês.",
  })
  @ApiResponse({
    status: 200,
    description: "Resumo financeiro retornado com sucesso",
  })
  async summary(@Request() req: any) {
    return this.paymentsService.getProviderFinanceSummary(req.user.sub);
  }

  @Get("items")
  @Roles("PROVIDER")
  @ApiOperation({
    summary: "Listar itens financeiros do prestador autenticado",
    description:
      "Pagamentos de pedidos em que o prestador autenticado é o provider da proposta aceita.",
  })
  @ApiQuery({
    name: "status",
    required: false,
    description: "Filtro por status do pagamento do cliente",
    enum: ["PENDING", "PAID", "FAILED", "REFUNDED", "CANCELLED"],
  })
  @ApiResponse({
    status: 200,
    description: "Lista de itens financeiros retornada com sucesso",
  })
  async items(@Request() req: any, @Query() query: FinanceItemsQueryDto) {
    return this.paymentsService.getProviderFinanceItems(
      req.user.sub,
      query.status,
    );
  }

  @Get("chart")
  @Roles("PROVIDER")
  @ApiOperation({
    summary: "Gráfico mensal do prestador autenticado",
    description:
      "Valores líquidos recebidos e taxas retidas por mês (pagamentos PAID), incluindo meses sem movimento com zeros.",
  })
  @ApiQuery({
    name: "months",
    required: false,
    description: "Quantidade de meses (incluindo o atual) — padrão 6, máx 24",
    example: 6,
  })
  @ApiResponse({
    status: 200,
    description: "Dados mensais retornados com sucesso",
  })
  async chart(@Request() req: any, @Query() query: FinanceChartQueryDto) {
    return this.paymentsService.getProviderFinanceChart(
      req.user.sub,
      query.months ?? 6,
    );
  }
}
