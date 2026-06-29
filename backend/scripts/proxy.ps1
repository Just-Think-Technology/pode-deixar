# Pode Deixar - Proxy Scripts
# Gerencia o Caddy reverse proxy
#
# Uso:
#   .\proxy.ps1 start    # inicia o proxy em background
#   .\proxy.ps1 stop     # para o proxy
#   .\proxy.ps1 run      # inicia em foreground (Ctrl+C para parar)

param([string]$Action = "run")

$Caddyfile = Resolve-Path "$PSScriptRoot\..\..\Caddyfile"

switch ($Action) {
  "start" {
    Write-Host "Iniciando Caddy em background..." -ForegroundColor Green
    & caddy start --config $Caddyfile
    if ($?) { Write-Host "Caddy rodando em http://localhost:8080" -ForegroundColor Cyan }
  }
  "stop" {
    Write-Host "Parando Caddy..." -ForegroundColor Yellow
    & caddy stop
  }
  "run" {
    Write-Host "Iniciando Caddy em foreground (Ctrl+C para parar)..." -ForegroundColor Green
    Write-Host "Proxy disponível em http://localhost:8080" -ForegroundColor Cyan
    & caddy run --config $Caddyfile
  }
  default {
    Write-Host "Uso: .\proxy.ps1 {start|stop|run}" -ForegroundColor Red
  }
}
