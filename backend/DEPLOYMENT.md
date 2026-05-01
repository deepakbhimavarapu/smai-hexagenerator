# 🚀 SMAI Backend Deployment Guide

This document explains how the SMAI backend is deployed to **Google Cloud Run** using **Docker**.

## 🏗️ Architecture Overview
*   **Framework**: FastAPI (Python 3.10)
*   **Database**: MongoDB Atlas
*   **Containerization**: Docker
*   **Platform**: Google Cloud Run (Serverless)

## 🛠️ Prerequisites
Before deploying, ensure you have the following installed and configured:
1.  [Google Cloud SDK (gcloud CLI)](https://cloud.google.com/sdk/docs/install)
2.  Docker (Optional, if building locally)
3.  Access to the Google Cloud Project: `cvit-edu-1`

---

## 🚢 Deployment Steps

Run these commands from the `/backend` directory.

### 1. Build and Push to Cloud Build
This command uploads your code to Google Cloud, where it is built into a Docker image using the `Dockerfile`.
```bash
gcloud builds submit --tag gcr.io/cvit-edu-1/smai-backend --project cvit-edu-1
```

### 2. Deploy to Cloud Run
Once the image is built, deploy it to the live service:
```bash
gcloud run deploy smai-backend \
  --image gcr.io/cvit-edu-1/smai-backend \
  --region us-central1 \
  --platform managed \
  --project cvit-edu-1
```

---

## ⚙️ Environment Variables
Cloud Run requires the following environment variables to be set in the Cloud Console:
*   `MONGODB_URI`: Your MongoDB Atlas connection string.
*   `SECRET_KEY`: The Fernet key used for link encryption.
*   `PORT`: Set to `8080` (Standard for Cloud Run).

## 🔍 Troubleshooting

### Permission Errors (Forbidden)
If you see a "Forbidden" error related to the Cloud Build bucket:
1.  **Enable APIs**: Ensure Cloud Build and Service Usage APIs are enabled:
    ```bash
    gcloud services enable cloudbuild.googleapis.com serviceusage.googleapis.com --project cvit-edu-1
    ```
2.  **IAM Roles**: Ensure your account has the `Cloud Build Editor` and `Storage Admin` roles in the Google Cloud Console.

### Local Build Fallback
If Cloud Build fails, you can build locally and push if you have Docker installed:
```bash
gcloud auth configure-docker
docker build -t gcr.io/cvit-edu-1/smai-backend .
docker push gcr.io/cvit-edu-1/smai-backend
```

---

## 🌐 Deployed URL
**Backend URL**: `https://smai-backend-295616937324.us-central1.run.app`

*Note: If this URL changes after deployment, remember to update the `VITE_API_URL` in the frontend `.env` and rebuild the frontend.*
