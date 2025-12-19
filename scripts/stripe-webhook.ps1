# stripe-webhook.ps1

# Check admin rights
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Start-Process PowerShell -Verb RunAs -ArgumentList "-File `"$PSCommandPath`""
    exit
}

Clear-Host
Write-Host "Stripe Webhook Listener" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Green

$webhook = "http://localhost:3000/api/stripe/webhook"

# Check if Stripe is installed
if (-not (Get-Command stripe -ErrorAction SilentlyContinue)) {
    Write-Host "Stripe CLI not found! Install with:" -ForegroundColor Red
    Write-Host "choco install stripe-cli" -ForegroundColor Yellow
    pause
    exit
}

Write-Host "Starting webhook listener..." -ForegroundColor Cyan
Write-Host "URL: $webhook" -ForegroundColor Gray
Write-Host ""

# Run the command
stripe listen --forward-to $webhook

# Keep window open on error
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Press any key to close..." -ForegroundColor Yellow
    pause
} 