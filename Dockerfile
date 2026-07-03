# Backend API only — deploy to Render (frontend on Vercel)
# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src

COPY UniClub-Hub.sln ./
COPY UniClub-Hub.Shared/ UniClub-Hub.Shared/
COPY UniClub-Hub.Membership/ UniClub-Hub.Membership/
COPY UniClub-Hub.Operations/ UniClub-Hub.Operations/
COPY UniClub-Hub.Portal/ UniClub-Hub.Portal/
COPY UniClub-Hub.Server/ UniClub-Hub.Server/

RUN dotnet restore UniClub-Hub.Server/UniClub-Hub.API.csproj
RUN dotnet publish UniClub-Hub.Server/UniClub-Hub.API.csproj \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache curl

COPY --from=build /app/publish ./

ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_URLS=http://+:8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8080/health >/dev/null || exit 1

ENTRYPOINT ["dotnet", "UniClub-Hub.API.dll"]
