# syntax=docker/dockerfile:1

#############
# build-env #
#############

FROM cosmtrek/air:v1.64.2

ENV MONGODB_URI=mongodb://database:27017/bluray_manager

RUN apt-get update \
  && apt-get install openssh-client -y

WORKDIR /go/src/

COPY . .

EXPOSE 8000/tcp

ENTRYPOINT ["air", "-c", "/go/src/.air.toml"]