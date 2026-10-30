#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Automated Google Cloud Run Deployment Script for Delta Backend
# Target Account: divagareofficial10@gmail.com
# -----------------------------------------------------------------------------
set -e

ACCOUNT="${1:-divagareofficial10@gmail.com}"
SERVICE_NAME="delta-backend"
REGION="${2:-asia-south1}" # Mumbai or us-central1

echo "=========================================================="
echo " 🚀 Delta Backend Deployment to Google Cloud Run"
echo "=========================================================="
echo "Target Account: $ACCOUNT"
echo "Service Name:   $SERVICE_NAME"
echo "Region:         $REGION"
echo ""

# 1. Switch or login Google Account
CURRENT_ACCOUNT=$(gcloud config get-value account 2>/dev/null || true)
if [ "$CURRENT_ACCOUNT" != "$ACCOUNT" ]; then
  echo "Switching active gcloud account to $ACCOUNT..."
  if gcloud auth list --format="value(account)" | grep -q "$ACCOUNT"; then
    gcloud config set account "$ACCOUNT"
  else
    echo "Account $ACCOUNT not logged in. Initiating login..."
    gcloud auth login "$ACCOUNT"
  fi
fi

# 2. Project Selection
PROJECT_ID=$(gcloud config get-value project 2>/dev/null || true)
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
  gcloud projects list
  read -p "Enter Google Cloud Project ID: " PROJECT_ID
  gcloud config set project "$PROJECT_ID"
fi

echo "Using Project ID: $PROJECT_ID"

# 3. Enable APIs
echo "Enabling Cloud Run and Cloud Build APIs..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com --project "$PROJECT_ID"

# 4. Deploy to Cloud Run
echo "Deploying container to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --project "$PROJECT_ID"

# 5. Output Service URL
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --project "$PROJECT_ID" --format="value(status.url)")

echo "=========================================================="
echo " 🎉 Deployment Succeeded!"
echo " Live Cloud Run URL: $SERVICE_URL"
echo ""
echo "Next step: In your Vercel Dashboard, set:"
echo "NEXT_PUBLIC_BACKEND_API_URL=$SERVICE_URL"
echo "=========================================================="

