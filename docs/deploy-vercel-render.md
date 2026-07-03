# Deploy — UniClub-Hub (Vercel FE + Render API)

## Kiến trúc production

| Thành phần | Nền tảng | Ghi chú |
|------------|----------|---------|
| **Frontend** (React/Vite) | **Vercel** | SPA, env `VITE_API_*` trỏ sang Render |
| **Backend** (ASP.NET API + SignalR) | **Render** | Docker image từ `Dockerfile` (API-only) |
| **PostgreSQL** | Render Postgres hoặc managed DB | Migration chạy tay |

Dev local vẫn dùng `dotnet run` + `npm run dev` (Vite proxy `/api` → backend).

---

## 1. Backend trên Render

### Cách A — Blueprint (`render.yaml`)

1. Push repo lên GitHub.
2. Render Dashboard → **New** → **Blueprint** → chọn repo.
3. Sau khi deploy, vào Web Service **uniclub-hub-api** và set:
   - `Cors__AllowedOrigins` = `https://your-app.vercel.app` (nhiều origin cách nhau bằng dấu phẩy)
   - `AppUrl` = `https://your-app.vercel.app` (link trong email xác thực / reset mật khẩu)
   - `Auth__CrossOriginCookies` = `true` (bắt buộc khi FE và API khác domain)
   - Cloudinary, SendGrid, Gemini… (secret thật)

4. Chạy migration (một lần, trên máy local):

```bash
dotnet ef database update \
  --project UniClub-Hub.Shared \
  --startup-project UniClub-Hub.Server \
  --connection "Host=...;Port=5432;Database=uniclub;Username=...;Password=..."
```

(Lấy connection string từ Render Postgres → **Connect**.)

### Cách B — Web Service thủ công

- **Runtime**: Docker
- **Dockerfile path**: `./Dockerfile`
- **Health check path**: `/health`
- Env vars giống `render.yaml` + `ConnectionStrings__DefaultConnection`

API URL mẫu: `https://uniclub-hub-api.onrender.com`

---

## 2. Frontend trên Vercel

1. Import repo GitHub vào Vercel.
2. **Root Directory**: `uniclub-hub.client`
3. **Framework Preset**: Vite (build: `npm run build`, output: `dist`)
4. **Environment Variables** (Production):

| Biến | Ví dụ |
|------|-------|
| `VITE_API_BASE_URL` | `https://uniclub-hub-api.onrender.com/api` |
| `VITE_API_ORIGIN` | `https://uniclub-hub-api.onrender.com` |
| `VITE_GOOGLE_CLIENT_ID` | (nếu dùng Google login) |

5. Deploy. SPA routing đã cấu hình trong `uniclub-hub.client/vercel.json`.

Sau deploy, quay lại Render cập nhật `Cors__AllowedOrigins` và `AppUrl` đúng domain Vercel.

---

## 3. Auth cross-origin (Vercel ↔ Render)

- Frontend gọi API qua `VITE_API_BASE_URL` (`axios` + `withCredentials: true`).
- Refresh token nằm trong HttpOnly cookie; backend set `SameSite=None; Secure` khi `Auth__CrossOriginCookies=true`.
- CORS phải khai báo **đúng origin Vercel** (không dùng `*`) và `AllowCredentials`.

---

## 4. Docker Compose (local — API + DB, không bundle FE)

```bash
cp env.docker.example .env
# Sửa JWT_KEY, mật khẩu DB

docker compose up --build
```

- API: http://localhost:8080/health  
- FE dev: `cd uniclub-hub.client && npm run dev` → https://localhost:54610 (proxy `/api`)

---

## 5. CD (GitHub Actions)

`.github/workflows/cd.yml` build **backend-only** Docker image, smoke test `/health`.

Push tag `v*` + secret `DOCKER_REGISTRY` để push image (tùy chọn).

---

## Checklist sau deploy

- [ ] `/health` trên Render trả `{ "status": "ok" }`
- [ ] Vercel load được trang login
- [ ] Đăng nhập / refresh token hoạt động (cookie cross-site)
- [ ] Email link (confirm/reset) trỏ đúng `AppUrl` Vercel
- [ ] SignalR (Kanban / notification) kết nối qua `VITE_API_ORIGIN`
