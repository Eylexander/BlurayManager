# syntax=docker/dockerfile:1

#############
# build-env #
#############

# Keep the Go version in step with the `go` directive in backend/go.mod:
# the air images bundle their own Go, which lagged behind and broke the build.
FROM golang:1.26

ENV MONGODB_URI=mongodb://database:27017/bluray_manager

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssh-client \
  && rm -rf /var/lib/apt/lists/*

RUN go install github.com/air-verse/air@latest

WORKDIR /go/src/

COPY . .

EXPOSE 8080/tcp

ENTRYPOINT ["air", "-c", "/go/src/.air.toml"]
