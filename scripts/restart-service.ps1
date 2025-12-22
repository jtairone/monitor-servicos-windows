# Script para reiniciar serviço Windows com privilégios elevados
# Uso: .\restart-service.ps1 -ServiceName "NomeDoServiço" -OutputFile "caminho\temp.txt"

param(
    [string]$ServiceName = "",
    [string]$OutputFile = ""
)

try {
    if ([string]::IsNullOrEmpty($ServiceName)) {
        Write-Host "ERROR: ServiceName não fornecido"
        if (-not [string]::IsNullOrEmpty($OutputFile)) {
            "FAILED: ServiceName não fornecido" | Out-File -FilePath $OutputFile -Encoding UTF8 -NoNewline
        }
        exit 1
    }

    # Tentar parar o serviço primeiro (para garantir restart)
    $service = Get-Service -Name $ServiceName -ErrorAction Stop
    
    if ($service.Status -eq "Running") {
        Stop-Service -Name $ServiceName -Force -ErrorAction Stop
        Start-Sleep -Seconds 1
    }
    
    # Iniciar o serviço
    Start-Service -Name $ServiceName -ErrorAction Stop
    
    # Aguardar para garantir que iniciou
    Start-Sleep -Seconds 2
    
    # Verificar se está rodando
    $service = Get-Service -Name $ServiceName
    if ($service.Status -eq "Running") {
        Write-Host "SUCCESS"
        if (-not [string]::IsNullOrEmpty($OutputFile)) {
            "SUCCESS" | Out-File -FilePath $OutputFile -Encoding UTF8 -NoNewline
        }
        exit 0
    } else {
        Write-Host "FAILED"
        if (-not [string]::IsNullOrEmpty($OutputFile)) {
            "FAILED: Serviço não iniciou" | Out-File -FilePath $OutputFile -Encoding UTF8 -NoNewline
        }
        exit 1
    }
}
catch {
    $errorMsg = $_.Exception.Message
    Write-Host "FAILED: $errorMsg"
    if (-not [string]::IsNullOrEmpty($OutputFile)) {
        "FAILED: $errorMsg" | Out-File -FilePath $OutputFile -Encoding UTF8 -NoNewline
    }
    exit 1
}
