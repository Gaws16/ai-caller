# seed-users.ps1
# PowerShell скрипт за създаване на тестови потребители в Supabase database
#
# Изпълнява SQL файл: database-drop-users-seed-users.sql
# Създава 7 тестови акаунта (5 workers + 2 businesses)
# Всички с парола: Chelsea05.

# Stop on any error
$ErrorActionPreference = "Stop"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "   Seed Test Users - hustl.bg" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# Configuration
# ============================================================================

# Database connection parameters
# От Supabase Dashboard → Settings → Database → Connection Pooling
$DbHost = "aws-0-eu-central-1.pooler.supabase.com"
$DbPort = "6543"
$DbUser = "postgres.pljlkzzzizljtgbzopnz"
$DbName = "postgres"
$DbPassword = "Hustl-Project-Admin"

# Path to SQL seed file (в parent директорията)
$SqlFile = Join-Path (Split-Path $PSScriptRoot -Parent) "database-drop-users-seed-users.sql"

# ============================================================================
# Helper Functions
# ============================================================================

function Pause-And-Exit {
    param([int]$ExitCode = 0)
    Write-Host ""
    Write-Host "Натисни Enter за изход..." -ForegroundColor Yellow
    $null = Read-Host
    exit $ExitCode
}

function Find-Psql {
    Write-Host "🔍 Търсене на psql..." -ForegroundColor Yellow

    # Check if psql is in PATH
    $psqlInPath = Get-Command psql -ErrorAction SilentlyContinue
    if ($psqlInPath) {
        Write-Host "✅ Намерен psql в PATH: $($psqlInPath.Source)" -ForegroundColor Green
        return $psqlInPath.Source
    }

    # Common PostgreSQL installation paths on Windows
    $commonPaths = @(
        "C:\Program Files\PostgreSQL\*\bin\psql.exe",
        "C:\Program Files (x86)\PostgreSQL\*\bin\psql.exe",
        "C:\PostgreSQL\*\bin\psql.exe"
    )

    foreach ($pathPattern in $commonPaths) {
        $found = Get-ChildItem -Path $pathPattern -ErrorAction SilentlyContinue |
                 Sort-Object -Property FullName -Descending |
                 Select-Object -First 1

        if ($found) {
            Write-Host "✅ Намерен psql: $($found.FullName)" -ForegroundColor Green
            return $found.FullName
        }
    }

    # Check pgAdmin 4 installation
    $pgAdmin4Path = Join-Path $env:LOCALAPPDATA "Programs\pgAdmin 4\runtime\psql.exe"
    if (Test-Path $pgAdmin4Path) {
        Write-Host "✅ Намерен psql в pgAdmin 4: $pgAdmin4Path" -ForegroundColor Green
        return $pgAdmin4Path
    }

    Write-Host "❌ psql не е намерен!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Моля, инсталирай PostgreSQL клиент от:" -ForegroundColor Yellow
    Write-Host "  https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Или инсталирай pgAdmin 4:" -ForegroundColor Yellow
    Write-Host "  https://www.pgadmin.org/download/pgadmin-4-windows/" -ForegroundColor Cyan

    return $null
}

# ============================================================================
# Main Script
# ============================================================================

try {
    # Set UTF-8 encoding for Bulgarian characters
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8

    # Validate SQL file exists
    if (-not (Test-Path $SqlFile)) {
        Write-Host "❌ Грешка: SQL файлът не е намерен!" -ForegroundColor Red
        Write-Host "   Очакван път: $SqlFile" -ForegroundColor Yellow
        Pause-And-Exit 1
    }

    Write-Host "📄 SQL файл: $SqlFile" -ForegroundColor Gray
    Write-Host ""

    # Find psql executable
    $psqlPath = Find-Psql
    if (-not $psqlPath) {
        Pause-And-Exit 1
    }

    Write-Host ""

    # Setup pgpass.conf for automatic authentication
    $pgpassPath = Join-Path $env:APPDATA "postgresql\pgpass.conf"
    $pgpassDir = Split-Path $pgpassPath -Parent

    if (-not (Test-Path $pgpassDir)) {
        New-Item -ItemType Directory -Path $pgpassDir -Force | Out-Null
    }

    # pgpass format: hostname:port:database:username:password
    $pgpassEntry = "${DbHost}:${DbPort}:${DbName}:${DbUser}:${DbPassword}"

    # Remove old entries for this host/user if they exist
    if (Test-Path $pgpassPath) {
        $existingContent = Get-Content $pgpassPath -ErrorAction SilentlyContinue
        $filteredContent = $existingContent | Where-Object {
            $_ -notmatch "^$DbHost.*$DbUser"
        }
        Set-Content -Path $pgpassPath -Value $filteredContent -Encoding UTF8 -Force
    }

    # Append new entry
    Add-Content -Path $pgpassPath -Value $pgpassEntry -Encoding UTF8

    Write-Host ""
    Write-Host "🚀 Изпълнявам SQL seed script..." -ForegroundColor Yellow
    Write-Host ""

    # Set environment variables for psql
    $env:PGHOST = $DbHost
    $env:PGPORT = $DbPort
    $env:PGUSER = $DbUser
    $env:PGDATABASE = $DbName
    $env:PGSSLMODE = "require"

    # Execute SQL file with psql
    # -v ON_ERROR_STOP=1 stops execution on first error
    & $psqlPath -v ON_ERROR_STOP=1 -f $SqlFile

    if ($LASTEXITCODE -ne 0) {
        throw "psql завърши с грешка (exit code: $LASTEXITCODE)"
    }

    Write-Host ""
    Write-Host "================================" -ForegroundColor Green
    Write-Host "   ✅ УСПЕШНО СЪЗДАДЕНИ!" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Green
    Write-Host ""

    Write-Host "Създадени 7 тестови акаунта:" -ForegroundColor Cyan
    Write-Host ""

    Write-Host "👷 Workers (5 акаунта):" -ForegroundColor Yellow
    Write-Host "  • gogata3000@gmail.com : Chelsea05." -ForegroundColor White
    Write-Host "  • gogata3001@gmail.com : Chelsea05." -ForegroundColor White
    Write-Host "  • gogata3002@gmail.com : Chelsea05." -ForegroundColor White
    Write-Host "  • gogata3003@gmail.com : Chelsea05." -ForegroundColor White
    Write-Host "  • gogata3004@gmail.com : Chelsea05." -ForegroundColor White
    Write-Host ""

    Write-Host "🏢 Businesses (2 акаунта):" -ForegroundColor Yellow
    Write-Host "  • gogata1905@abv.bg : Chelsea05." -ForegroundColor White
    Write-Host "  • gogata1905@yahoo.com : Chelsea05." -ForegroundColor White
    Write-Host ""

    Write-Host "Можеш да се логнеш с всеки от тези акаунти в:" -ForegroundColor Gray
    Write-Host "  http://localhost:3000" -ForegroundColor Cyan
    Write-Host ""

    Write-Host "💡 Всички workers са одобрени (approved_for_work = true)" -ForegroundColor Gray
    Write-Host "💡 Всички businesses са verified (verified = true)" -ForegroundColor Gray
    Write-Host ""

    Pause-And-Exit 0

} catch {
    Write-Host ""
    Write-Host "================================" -ForegroundColor Red
    Write-Host "   ❌ ГРЕШКА!" -ForegroundColor Red
    Write-Host "================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Съобщение за грешка:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host $_.ScriptStackTrace -ForegroundColor Gray
    Write-Host ""

    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Провери дали database паролата е правилна" -ForegroundColor White
    Write-Host "  2. Провери дали имаш интернет връзка" -ForegroundColor White
    Write-Host "  3. Провери дали SQL файлът съществува" -ForegroundColor White
    Write-Host ""

    Pause-And-Exit 1

} finally {
    # Cleanup: Remove environment variables
    Remove-Item Env:\PGHOST -ErrorAction SilentlyContinue
    Remove-Item Env:\PGPORT -ErrorAction SilentlyContinue
    Remove-Item Env:\PGUSER -ErrorAction SilentlyContinue
    Remove-Item Env:\PGDATABASE -ErrorAction SilentlyContinue
    Remove-Item Env:\PGSSLMODE -ErrorAction SilentlyContinue
}
