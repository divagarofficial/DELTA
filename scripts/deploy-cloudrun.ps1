<#
.SYNOPSIS
  Automated Google Cloud Run Deployment Script for Delta Backend
  Target Account: divagareofficial10@gmail.com
#>

param(
  [string]$Account = "divagareofficial10@gmail.com",
  [string]$ServiceName = "delta-backend",
  [string]$Region = "asia-south1", # Mumbai (low latency for South Asia), or us-central1
  [string]$ProjectId = ""
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " 🚀 Delta Backend Deployment to Google Cloud Run" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Target Google Account: $Account" -ForegroundColor Yellow
Write-Host "Service Name:          $ServiceName" -ForegroundColor Yellow
Write-Host "Target Region:         $Region" -ForegroundColor Yellow
Write-Host ""

# 1. Verify / Switch Google Account
$currentAccount = (gcloud config get-value account 2>$null)
if ($currentAccount -ne $Account) {
    Write-Host "Switching active gcloud account to $Account..." -ForegroundColor Green
    $accounts = (gcloud auth list --format="value(account)" 2>$null)
    if ($accounts -contains $Account) {
        gcloud config set account $Account
    } else {
        Write-Host "Account $Account is not yet authenticated in gcloud." -ForegroundColor Yellow
        Write-Host "Launching web browser for authentication..." -ForegroundColor Yellow
        gcloud auth login $Account
    }
}

# 2. Check / Select Project
if ([string]::IsNullOrWhiteSpace($ProjectId)) {
    $ProjectId = (gcloud config get-value project 2>$null)
}

if ([string]::IsNullOrWhiteSpace($ProjectId) -or $ProjectId -eq "(unset)") {
    Write-Host "No active Google Cloud Project selected." -ForegroundColor Yellow
    $projects = gcloud projects list --format="table(projectId,name)" | Out-String
    Write-Host $projects -ForegroundColor Gray
    $ProjectId = Read-Host "Please enter your Google Cloud Project ID (e.g. delta-production)"
    gcloud config set project $ProjectId
}

Write-Host "Using Project: $ProjectId" -ForegroundColor Green

# 3. Enable Required Google Cloud APIs
Write-Host "`nEnabling Cloud Run and Cloud Build APIs..." -ForegroundColor Green
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com --project $ProjectId

# 4. Deploy to Google Cloud Run
Write-Host "`nBuilding container image and deploying to Cloud Run in region $Region..." -ForegroundColor Green
gcloud run deploy $ServiceName `
    --source . `
    --region $Region `
    --platform managed `
    --allow-unauthenticated `
    --port 8080 `
    --memory 1Gi `
    --cpu 1 `
    --min-instances 0 `
    --max-instances 10 `
    --project $ProjectId

# 5. Retrieve Live Service URL
$serviceUrl = (gcloud run services describe $ServiceName --region $Region --project $ProjectId --format="value(status.url)" 2>$null)

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " 🎉 Deployment Succeeded!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Live Google Cloud Run Backend URL:" -ForegroundColor Cyan
Write-Host "👉 $serviceUrl" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host "`nNext Steps for Vercel Frontend:" -ForegroundColor Yellow
Write-Host "1. In your Vercel Project Settings -> Environment Variables, add:" -ForegroundColor White
Write-Host "   NEXT_PUBLIC_BACKEND_API_URL = $serviceUrl" -ForegroundColor Cyan
Write-Host "2. Redeploy your Vercel project to automatically proxy /api/* requests to Cloud Run." -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green

