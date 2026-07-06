# Docker local — API + PostgreSQL (frontend chạy riêng hoặc trên Vercel)

Xem hướng dẫn deploy production: [deploy-vercel-render.md](./deploy-vercel-render.md)

## Chạy local

```bash
cp env.docker.example .env
# Sửa JWT_KEY và mật khẩu DB trong .env

docker compose up --build
```

- API health: http://localhost:8080/health
- FE dev: `cd uniclub-hub.client && npm run dev` → https://localhost:54610

## Migration (chạy tay trên máy host)

```bash
dotnet ef database update \
  --project UniClub-Hub.Shared \
  --startup-project UniClub-Hub.Server \
  --connection "Host=localhost;Port=5432;Database=uniclub;Username=uniclub;Password=YOUR_PASSWORD"
```

## Build image backend riêng

```bash
docker build -t uniclub-hub-api:latest .
docker run --rm -p 8080:8080 \
  -e ConnectionStrings__DefaultConnection="Host=host.docker.internal;..." \
  -e Jwt__Key="your-key-at-least-32-characters-long" \
  -e Cors__AllowedOrigins="https://your-app.vercel.app" \
  -e Auth__CrossOriginCookies=true \
  uniclub-hub-api:latest
```
