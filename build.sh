#!/bin/bash

# Parse eventual options
DEV=false
OPTIONS=""
FRONTEND=false
BACKEND=false
PUSH=false
for arg in "$@"; do
    shift
    case "$arg" in
    -dev) DEV=true ;;
    -frontend) FRONTEND=true ;;
    -backend) BACKEND=true ;;
    -nc) OPTIONS="$OPTIONS --no-cache" ;;
    -push) PUSH=true ;;
    -h | --help)
        echo "Options:\n-dev : build using Dockerfile.dev\n-nc : build with --no-cache"\n-push : push to microk8s registry
        exit 1
        ;;
    *)
        echo "Option doesn't exist"
        exit 1
        ;;
    esac
done

if [ $DEV = true ]; then
    if [ $BACKEND = true ] || [ $FRONTEND = false ] && [ $BACKEND = false ]; then
        DOCKER_BUILDKIT=1 docker build $OPTIONS -f ./docker/backend.dev.Dockerfile --tag bluray-backend-dev ./backend
    fi
    if [ $FRONTEND = true ] || [ $FRONTEND = false ] && [ $BACKEND = false ]; then
        DOCKER_BUILDKIT=1 docker build $OPTIONS -f ./docker/frontend.dev.Dockerfile --tag bluray-frontend-dev ./frontend
    fi
else
    if [ $BACKEND = true ] || [ $FRONTEND = false ] && [ $BACKEND = false ]; then
        DOCKER_BUILDKIT=1 docker build $OPTIONS -f ./docker/backend.Dockerfile --tag eylexander/bluray-backend:latest ./backend
    fi
    if [ $FRONTEND = true ] || [ $FRONTEND = false ] && [ $BACKEND = false ]; then
        DOCKER_BUILDKIT=1 docker build $OPTIONS -f ./docker/frontend.Dockerfile --tag eylexander/bluray-frontend:latest ./frontend
    fi
fi

if [ $PUSH = true ]; then
    if [ $BACKEND = true ] || [ $FRONTEND = false ] && [ $BACKEND = false ]; then
        docker push eylexander/bluray-backend:latest
    fi
    if [ $FRONTEND = true ] || [ $FRONTEND = false ] && [ $BACKEND = false ]; then
        docker push eylexander/bluray-frontend:latest
    fi
fi