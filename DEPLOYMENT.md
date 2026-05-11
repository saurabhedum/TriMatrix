# Deployment Guide for TriMatrix

This guide provides instructions on how to build, containerize, and deploy the TriMatrix application.

## 1. Local Development

To run the application locally in development mode:

```bash
npm install
npm run dev
```

## 2. Production Build

To build the application for production:

```bash
npm run build
```

The build output will be in the `dist/` directory.

## 3. Containerization with Docker

To build and run the application using Docker:

### Build the Docker Image

```bash
docker build -t trimatrix .
```

### Run the Container

```bash
docker run -p 3000:3000 --env-file .env trimatrix
```

## 4. Using Docker Compose

To build and run the application using Docker Compose:

```bash
docker-compose up --build
```

This will build the image and start the container as defined in `docker-compose.yml`.

## 5. CI/CD Pipeline

A basic CI/CD pipeline is configured using GitHub Actions in `.github/workflows/deploy.yml`. This pipeline automates:

- Linting
- Building the application
- Deploying to a staging environment (requires configuration of deployment secrets)

## 6. Environment Variables

Ensure all required environment variables are set in your production environment or `.env` file:

- `GEMINI_API_KEY`: Required for Gemini AI API calls.
- `APP_URL`: The URL where this applet is hosted.
- `NODE_ENV`: Set to `production` for production builds.
- `PORT`: The port the server will listen on (default: 3000).

## 7. Deployment to Cloud Platforms

### Cloud Run (Recommended)

To deploy to Google Cloud Run:

```bash
gcloud run deploy trimatrix --source . --region us-central1 --allow-unauthenticated
```

Ensure you set the `GEMINI_API_KEY` in the Cloud Run service environment variables.
