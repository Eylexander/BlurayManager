##################
# build-env-back #
##################

FROM golang:trixie AS builder

LABEL maintainer="Eylexander <me@eylexander.fr>"

ENV MONGODB_URI="mongodb://bluray_manager:27017" \
    DB_NAME="bluray_manager" \
    PORT="8080"

WORKDIR /go/src

COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o bluray-server ./cmd/main.go

################
# target image #
################
FROM gcr.io/distroless/static-debian11

WORKDIR /opt/app

# Copy the binary from builder
COPY --from=builder /go/src/bluray-server /opt/app/bluray-server

EXPOSE 8080

ENTRYPOINT ["/opt/app/bluray-server"]