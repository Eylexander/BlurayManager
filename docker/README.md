# Docker Configuration for Bluray Manager

This folder contains all Docker-related files for the Bluray Manager project.

## Usage

### Simple Setup (MongoDB only)

If you want to run only MongoDB and develop locally:

```bash
cd docker
docker-compose -f docker-compose.simple.yml up -d
```

## Environment Variables

See `.env.prod.example` for required production environment variables.
