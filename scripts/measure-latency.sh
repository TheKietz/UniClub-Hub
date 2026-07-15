#!/usr/bin/env bash
# Đo thời gian phản hồi thực tế của các endpoint đại diện (Auth, Clubs, Members,
# Departments, KPI, Notifications) — dùng để kiểm tra ngưỡng "phản hồi < 500ms".
#
# Cách chạy:
#   1. Khởi động API ở môi trường Development: dotnet run --project UniClub-Hub.Server/UniClub-Hub.API.csproj
#   2. Chạy: bash scripts/measure-latency.sh [base_url] [email] [password]
#      Mặc định: base_url=http://localhost:5080, dùng tài khoản demo an.clb@uef.edu.vn

set -euo pipefail

BASE_URL="${1:-http://localhost:5080}"
EMAIL="${2:-an.clb@uef.edu.vn}"
PASSWORD="${3:-User@123456}"

measure() {
  local name="$1"; shift
  curl -s -o /dev/null "$@"           # warm-up, loại bỏ chi phí mở connection lần đầu
  local total=0
  for _ in 1 2 3; do
    t=$(curl -s -o /dev/null -w "%{time_total}" "$@")
    ms=$(echo "$t * 1000" | bc)
    total=$(echo "$total + $ms" | bc)
  done
  local avg
  avg=$(echo "scale=1; $total / 3" | bc)
  printf "%-30s %s ms (trung bình 3 lần)\n" "$name" "$avg"
}

echo "== Đăng nhập lấy access token =="
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")

echo
echo "== Đo latency từng endpoint =="
measure "POST /auth/login" -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
measure "GET /clubs" -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/clubs"
measure "GET /users/me" -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/users/me"
measure "GET /clubs/1/members" -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/clubs/1/members"
measure "GET /clubs/1/departments" -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/clubs/1/departments"
measure "GET /clubs/1/kpi/results/me" -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/clubs/1/kpi/results/me"
measure "GET /notifications" -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/notifications"
