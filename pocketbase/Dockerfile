# Build from the repository root: docker build -f pocketbase/Dockerfile .
FROM --platform=$BUILDPLATFORM golang:1.23.4-alpine AS build
ARG TARGETOS
ARG TARGETARCH
WORKDIR /src
COPY pocketbase/go.mod pocketbase/go.sum ./
RUN go mod download
COPY pocketbase/ ./
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -trimpath -o /out/app . \
    && CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -trimpath -o /out/resources ./cmd/resources \
    && CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -trimpath -o /out/testquestionnaires ./cmd/testquestionnaires

FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata \
    && mkdir -p /pb/pb_data && chgrp -R 0 /pb && chmod -R g=u /pb
WORKDIR /pb
COPY --from=build /out/app /out/resources /out/testquestionnaires /pb/
COPY content/resources/generated/bundle.json /pb/content/bundle.json
COPY content/resources/generated/assets/ /pb/content/assets/
COPY content/questionnaires/production-20261007.json /pb/content/questionnaires.json
COPY web/src/assets/redesign/faq-categories/*-card-*.svg /pb/content/faq-cards/
EXPOSE 8080
USER 1001
CMD ["/pb/app", "serve", "--dir=/pb/pb_data", "--http=0.0.0.0:8080"]
