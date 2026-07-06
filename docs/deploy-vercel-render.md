# Deploy — UniClub-Hub (Vercel FE + Render API)

## Runbook — deploy lần đầu (thứ tự bắt buộc)

1. **Deploy Render trước** — Render Dashboard → **New** → **Blueprint** → chọn repo (`render.yaml`). Chờ Web Service **uniclub-hub-api** chạy xong → ghi lại domain tạm (vd. `https://uniclub-hub-api.onrender.com`).
2. **Set env trên Render** (các biến `sync: false` trong Blueprint — set tay trên dashboard):
   - `ConnectionStrings__DefaultConnection` (Render Postgres → **Connect**)
   - `JWT_KEY` (≥ 32 ký tự)
   - `Cors__AllowedOrigins` — tạm: `https://localhost:54610` hoặc domain Vercel nếu đã biết
   - `AppUrl` — tạm: domain Render hoặc localhost dev
   - `Auth__CrossOriginCookies` = `true` (bắt buộc khi FE và API khác domain)
   - `Cloudinary__*`, `SendGrid__*`, `Gemini__*` (secret thật)
3. **Migration tự chạy** khi container API khởi động — **không cần** `dotnet ef database update` tay. Kiểm tra log Render: container start thành công, `/health` trả `{ "status": "ok" }`.
4. **Deploy Vercel** — import repo, **Root Directory** = `uniclub-hub.client`, set Production env:
   - `VITE_API_BASE_URL` = `https://<render-domain>/api`
   - `VITE_API_ORIGIN` = `https://<render-domain>`
   - `VITE_GOOGLE_CLIENT_ID` (nếu dùng Google login)
5. **Quay lại Render** — cập nhật `Cors__AllowedOrigins` và `AppUrl` thành **domain Vercel thật** (bước dễ quên nhất). Redeploy hoặc chờ service reload env.
6. **(Tuỳ chọn) Seed demo data** — trên Render set `Seed__DemoData=true` → redeploy API. Seeder idempotent (chỉ thêm dữ liệu thiếu). Tài khoản demo: `admin@uef.edu.vn` / `Admin@123456` — **đổi mật khẩu sau khi seed**.
7. **Test cuối** — checklist ở cuối file này (health, login, refresh cookie, email link, SignalR).

> **Lưu ý:** Bước 5 phải làm sau khi có domain Vercel — nếu set CORS sai origin, login/refresh cookie cross-site sẽ fail.

---

## Kiến trúc production

| Thành phần | Nền tảng | Ghi chú |
|------------|----------|---------|
| **Frontend** (React/Vite) | **Vercel** | SPA, env `VITE_API_*` trỏ sang Render |
| **Backend** (ASP.NET API + SignalR) | **Render** | Docker image từ `Dockerfile` (API-only) |
| **PostgreSQL** | Render Postgres hoặc managed DB | Migration tự chạy lúc container start |

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
   - **Kiểm tra DB link:** `ConnectionStrings__DefaultConnection` phải có giá trị (Render tự gán từ `uniclub-hub-db`). Nếu trống/sai → vào DB **Connections** → copy **Internal Connection String** → dán vào env API.

Migration chạy nền sau khi Kestrel bind cổng (`DatabaseMigrationHostedService`). Render inject biến `PORT` — app bind theo `PORT`, không hardcode 8080. Không cần chạy `dotnet ef database update` tay.

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
- Migration tự chạy khi container `api` start (giống Render).

---

## 5. CD (GitHub Actions)

`.github/workflows/cd.yml` build **backend-only** Docker image, smoke test `/health`.

Push tag `v*` + secret `DOCKER_REGISTRY` để push image (tùy chọn).

Render và Vercel deploy qua push-to-deploy riêng — GitHub Actions **không** tự deploy lên hai nền tảng này.

---

## Checklist sau deploy

- [ ] `/health` trên Render trả `{ "status": "ok" }`
- [ ] Vercel load được trang login
- [ ] Đăng nhập / refresh token hoạt động (cookie cross-site)
- [ ] Email link (confirm/reset) trỏ đúng `AppUrl` Vercel
- [ ] SignalR (Kanban / notification) kết nối qua `VITE_API_ORIGIN`
