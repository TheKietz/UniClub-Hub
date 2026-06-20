# Dinh huong Position va Permission trong CLB

## 1. Y tuong chinh

Trong he thong nen tach ro 3 khai niem:

- `SystemRole`: vai tro cua tai khoan trong toan bo he thong.
- `ClubPosition`: chuc danh cua sinh vien trong tung CLB.
- `Permission`: quyen duoc thuc hien mot chuc nang cu the.

Theo y kien cua thay, nguoi dung trong de tai chu yeu la sinh vien.

Ve mat nghiep vu co the hieu `USER` hien tai la `student/user`.

Trong giai doan nay khong doi `USER` thanh `STUDENT` trong code, vi `USER` da duoc dung o nhieu noi va viec doi ten khong giai quyet truc tiep bai toan position/permission.

Nhung khi sinh vien tham gia tung CLB, sinh vien do co the co cac vai tro/chuc danh khac nhau trong moi CLB.

Vi du:

```text
Nguyen Van A
- SystemRole: USER
- O CLB Cong nghe: Truong ban Ky thuat
- O CLB Tieng Anh: Thanh vien
```

Nhu vay, `USER` la vai tro he thong cua sinh vien. Con `Truong ban Ky thuat`, `Thanh vien` la position trong CLB.

## 2. Hien trang he thong

Hien tai he thong dang co:

### Role he thong

```text
SUPER_ADMIN
USER
```

Y nghia hien tai:

- `SUPER_ADMIN`: quan ly toan bo he thong.
- `USER`: nguoi dung thong thuong, chu yeu la sinh vien.

Ghi chu: neu can trinh bay voi thay, co the giai thich `USER` trong code chinh la tai khoan sinh vien thong thuong. Ten hien thi tren giao dien/tai lieu co the ghi la "Sinh vien" ma khong bat buoc doi enum role trong code.

### Role trong CLB hien tai

```text
CLUB_ADMIN
DEPT_LEAD
MEMBER
```

Y nghia hien tai:

- `CLUB_ADMIN`: quan ly toan bo CLB.
- `DEPT_LEAD`: quan ly mot ban/phong ban trong CLB.
- `MEMBER`: thanh vien thong thuong.

Nhom nay dang bi gan chat voi giao dien quan ly hien tai. Ve lau dai nen xem day la cac role/position mac dinh de migrate dan sang mo hinh position linh hoat.

## 3. Van de can giai quyet

Neu chi co `CLUB_ADMIN`, `DEPT_LEAD`, `MEMBER` thi he thong chua mo ta duoc co cau thuc te cua CLB.

Trong CLB co the co nhieu chuc danh:

- Chu nhiem
- Pho chu nhiem
- Truong ban
- Pho ban
- Thu ky
- Thu quy
- Content Writer
- Designer
- Photographer
- Hau can
- Doi ngoai

Moi CLB co the dat ten va chia co cau khac nhau. Vi vay khong nen hard-code tat ca cac chuc danh nay vao enum role.

## 4. Huong thiet ke moi

He thong se co:

### SystemRole

Dung cho cap toan he thong:

```text
SUPER_ADMIN
USER
```

Trong do:

- `SUPER_ADMIN` quan ly nen tang.
- `USER` la tai khoan sinh vien/nguoi dung thong thuong.

### ClubPosition

Dung cho cap CLB:

```text
Chu nhiem
Pho chu nhiem
Truong ban Truyen thong
Pho ban Truyen thong
Thu quy
Content Writer
Designer
Thanh vien
```

Position do club admin tao va quan ly.

Mot position co the thuoc:

- Toan CLB, vi du `Chu nhiem`, `Pho chu nhiem`, `Thu quy`.
- Mot ban cu the, vi du `Truong ban Truyen thong`, `Designer`, `Content Writer`.

### Permission

Dung de mo khoa chuc nang.

Permission la danh sach co dinh do he thong dinh nghia trong code. Club admin khong tu nhap permission moi, chi duoc chon trong danh sach co san.

Vi du:

```text
membership.members.view
membership.members.manage
membership.departments.manage
membership.applications.review
membership.org_chart.manage
club.settings.manage
club.audit_log.view
operations.tasks.view
operations.tasks.manage
operations.events.manage
portal.content.manage
portal.media.manage
finance.transactions.view
finance.transactions.manage
```

## 5. Cach gan quyen

Club admin tao position, sau do chon permission cho position do.

Vi du:

```text
Position: Chu nhiem
Permissions:
- Tat ca quyen trong CLB
```

```text
Position: Truong ban Truyen thong
Permissions:
- membership.members.view
- operations.tasks.manage
- portal.content.manage
- portal.media.manage
```

```text
Position: Thu quy
Permissions:
- finance.transactions.view
- finance.transactions.manage
```

```text
Position: Content Writer
Permissions:
- portal.content.manage
- portal.media.manage
```

## 6. Giao dien nen xu ly nhu the nao

Khong nen tao layout rieng cho tung position.

Nen giu cac nhom layout lon:

- `AdminLayout` cho `SUPER_ADMIN`.
- `ClubManageLayout` cho sinh vien co quyen quan ly trong CLB.
- `MemberLayout` cho sinh vien chi co quyen co ban.

Menu, nut bam, trang chuc nang se hien dua tren permission.

Vi du:

```text
Co permission membership.members.manage
-> hien nut Them thanh vien

Co permission portal.content.manage
-> hien menu Noi dung truyen thong

Co permission club.settings.manage
-> hien menu Cai dat CLB

Khong co permission
-> an menu va backend cung chan truy cap
```

Backend bat buoc phai check permission. Frontend chi an/hien giao dien de trai nghiem tot hon.

## 7. Du lieu can co

Co the thiet ke cac bang chinh nhu sau:

```text
ClubPositions
- Id
- ClubId
- DepartmentId nullable
- Name
- Description
- IsDefault
- CreatedAt

Permissions
- Id
- Code
- Name
- Description
- Group

ClubPositionPermissions
- PositionId
- PermissionId

ClubMemberPositions
- MembershipId
- PositionId
```

Neu muon don gian hon o giai doan dau, co the chua can bang `Permissions` rieng, ma hard-code danh sach permission trong backend va chi luu `PermissionCode`.

## 8. Cach chuyen tu he thong hien tai

Khong nen xoa ngay `CLUB_ADMIN`, `DEPT_LEAD`, `MEMBER`.

Nen lam tung buoc:

1. Giu `ClubRole` hien tai de he thong khong vo.
2. Them `ClubPosition`.
3. Tao position mac dinh tu `ClubRole` hien tai:
   - `CLUB_ADMIN` -> `Chu nhiem` hoac `Ban chu nhiem`
   - `DEPT_LEAD` -> `Truong ban`
   - `MEMBER` -> `Thanh vien`
4. Them permission cho position.
5. Doi dan logic check quyen tu `clubRole` sang permission.
6. Khi on dinh, `ClubRole` chi con la fallback hoac co the bo dan.

## 9. Quyet dinh ve USER va STUDENT

Tam thoi giu `USER` trong code.

Ly do:

- `USER` da duoc dung trong auth, seeder, token, API va frontend.
- Doi sang `STUDENT` ton cong migration va co nguy co gay loi phan quyen.
- Bai toan can giai quyet hien tai la role/position trong CLB, khong phai ten role he thong.

Khi trinh bay nghiep vu, co the ghi:

```text
SystemRole USER = tai khoan sinh vien thong thuong
```

Sau nay neu that su can doi ten, se lam thanh mot task rieng.

## 10. Ket luan

Dinh huong dung la:

```text
SystemRole = SUPER_ADMIN / USER
ClubPosition = Chu nhiem / Pho chu nhiem / Truong ban / Pho ban / Thu quy / Content Writer / ...
Permission = quyen chuc nang co dinh trong he thong
```

Khong hard-code logic theo ten position.

Chi hard-code permission va route/API tuong ung. Club admin tao position va gan permission cho position.

Day la huong linh hoat, dung voi y thay va phu hop voi muc tieu low-code cua he thong.
