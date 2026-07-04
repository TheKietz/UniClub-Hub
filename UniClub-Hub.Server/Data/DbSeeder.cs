using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Shared.Constants;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Server.Data
{
    public static class DbSeeder
    {
        public static async Task SeedAsync(IServiceProvider services)
        {
            using var scope = services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<UniClubDbContext>();
            var userManager = scope.ServiceProvider.GetRequiredService<
                UserManager<ApplicationUser>
            >();
            var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

            // ── Roles ──────────────────────────────────────────────────────
            foreach (var role in new[] { "SUPER_ADMIN", "USER" })
            {
                if (!await roleManager.RoleExistsAsync(role))
                    await roleManager.CreateAsync(new IdentityRole(role));
            }

            // ── Categories ────────────────────────────────────────────────
            var categoryMap = new Dictionary<string, Category>();
            if (!await db.Categories.AnyAsync())
            {
                var cats = new[]
                {
                    new Category { Name = "Học thuật & Nghiên cứu", Description = "..." },
                    new Category { Name = "Thể thao & Sức khỏe", Description = "..." },
                    new Category { Name = "Văn nghệ & Nghệ thuật", Description = "..." },
                    new Category { Name = "Kỹ năng & Phát triển bản thân", Description = "..." },
                    new Category { Name = "Tình nguyện & Cộng đồng", Description = "..." }
                };
                db.Categories.AddRange(cats);
                foreach (var c in cats) categoryMap[c.Name.Split(' ')[0]] = c;
            }
            else
            {
                // Nếu đã có data thì mới query 1 lần duy nhất
                var existingCats = await db.Categories.ToListAsync();
                foreach (var c in existingCats) categoryMap[c.Name.Split(' ')[0]] = c;
            }

            var categories = await db.Categories.ToListAsync();
            int catHocThuat = categories.First(c => c.Name.StartsWith("Học thuật")).Id;
            int catTheThao = categories.First(c => c.Name.StartsWith("Thể thao")).Id;
            int catVanNghe = categories.First(c => c.Name.StartsWith("Văn nghệ")).Id;
            int catKyNang = categories.First(c => c.Name.StartsWith("Kỹ năng")).Id;
            int catTinhNguyen = categories.First(c => c.Name.StartsWith("Tình nguyện")).Id;

            // ── Users ─────────────────────────────────────────────────────
            var usersData = new[] 
            {
                // (email, fullName, studentId, major, gender, role, password)
                (
                    "admin@uef.edu.vn",
                    "Nguyễn Quản Trị",
                    null,
                    "Công nghệ thông tin",
                    "Nam",
                    "SUPER_ADMIN",
                    "Admin@123456"
                ),
                (
                    "truong.clb@uef.edu.vn",
                    "Trần Văn Trưởng",
                    "2151000001",
                    "Công nghệ thông tin",
                    "Nam",
                    "USER",
                    "User@123456"
                ),
                (
                    "linh.clb@uef.edu.vn",
                    "Phạm Thị Linh",
                    "2151000002",
                    "Marketing",
                    "Nữ",
                    "USER",
                    "User@123456"
                ),
                (
                    "minh.clb@uef.edu.vn",
                    "Lê Quang Minh",
                    "2151000003",
                    "Quản trị kinh doanh",
                    "Nam",
                    "USER",
                    "User@123456"
                ),
                (
                    "hoa.clb@uef.edu.vn",
                    "Nguyễn Thị Hoa",
                    "2151000004",
                    "Ngôn ngữ Anh",
                    "Nữ",
                    "USER",
                    "User@123456"
                ),
                (
                    "an.clb@uef.edu.vn",
                    "Võ Hoàng An",
                    "2151000005",
                    "Kế toán",
                    "Nam",
                    "USER",
                    "User@123456"
                ),
                (
                    "mai.clb@uef.edu.vn",
                    "Đinh Thị Mai",
                    "2151000006",
                    "Tài chính - Ngân hàng",
                    "Nữ",
                    "USER",
                    "User@123456"
                ),
                (
                    "duc.clb@uef.edu.vn",
                    "Bùi Văn Đức",
                    "2151000007",
                    "Logistics và quản lý chuỗi cung ứng",
                    "Nam",
                    "USER",
                    "User@123456"
                ),
                (
                    "thu.clb@uef.edu.vn",
                    "Ngô Minh Thu",
                    "2151000008",
                    "Thương mại điện tử",
                    "Nữ",
                    "USER",
                    "User@123456"
                ),
                (
                    "khoa.clb@uef.edu.vn",
                    "Trương Văn Khoa",
                    "2151000009",
                    "Kinh doanh quốc tế",
                    "Nam",
                    "USER",
                    "User@123456"
                ),
            };

            var createdUsers = new Dictionary<string, ApplicationUser>();

            foreach (var (email, fullName, studentId, major, gender, role, password) in usersData)
            {
                var existing = await userManager.FindByEmailAsync(email);
                if (existing == null)
                {
                    var user = new ApplicationUser
                    {
                        UserName = email,
                        Email = email,
                        EmailConfirmed = true,
                        FullName = fullName,
                        StudentId = studentId,
                        Major = major,
                        Gender = gender,
                    };
                    var result = await userManager.CreateAsync(user, password);
                    if (result.Succeeded)
                    {
                        await userManager.AddToRoleAsync(user, role);
                        createdUsers[email] = user;
                    }
                }
                else
                {
                    createdUsers[email] = existing;
                }
            }

            // ── Clubs ─────────────────────────────────────────────────────
            var clubMap = new Dictionary<string, Club>();
            if (!await db.Clubs.IgnoreQueryFilters().AnyAsync())
            {
                var clubs = new[]
                {
                    new Club
                    {
                        Name = "CLB Công nghệ UEF",
                        Code = "TECH",
                        CategoryId = catHocThuat,
                        Description =
                            "Câu lạc bộ công nghệ thông tin — nơi sinh viên đam mê lập trình, AI và phát triển phần mềm cùng nhau học hỏi và thi đấu.",
                        ContactInfo = "tech@uef.edu.vn",
                        AdvisorName = "ThS. Nguyễn Văn Advisor",
                        EstablishedDate = new DateOnly(2018, 9, 1),
                        Status = ClubStatus.Active,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    },
                    new Club
                    {
                        Name = "CLB Bóng đá UEF",
                        Code = "FOOTBALL",
                        CategoryId = catTheThao,
                        Description =
                            "Câu lạc bộ bóng đá — rèn luyện thể lực, tinh thần đồng đội và tranh tài trong các giải đấu sinh viên.",
                        ContactInfo = "football@uef.edu.vn",
                        AdvisorName = "ThS. Trần Văn Coach",
                        EstablishedDate = new DateOnly(2015, 3, 1),
                        Status = ClubStatus.Active,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    },
                    new Club
                    {
                        Name = "CLB Âm nhạc UEF",
                        Code = "MUSIC",
                        CategoryId = catVanNghe,
                        Description =
                            "Câu lạc bộ âm nhạc — nơi những tâm hồn yêu nghệ thuật gặp nhau, biểu diễn và sáng tạo âm nhạc.",
                        ContactInfo = "music@uef.edu.vn",
                        AdvisorName = "ThS. Lê Thị Nhạc",
                        EstablishedDate = new DateOnly(2017, 1, 15),
                        Status = ClubStatus.Active,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    },
                    new Club
                    {
                        Name = "CLB Tiếng Anh UEF",
                        Code = "ENGLISH",
                        CategoryId = catKyNang,
                        Description =
                            "Câu lạc bộ Tiếng Anh — phát triển kỹ năng giao tiếp, IELTS, MC và thuyết trình bằng tiếng Anh.",
                        ContactInfo = "english@uef.edu.vn",
                        AdvisorName = "ThS. Phạm Thị English",
                        EstablishedDate = new DateOnly(2016, 6, 1),
                        Status = ClubStatus.Active,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    },
                    new Club
                    {
                        Name = "CLB Tình nguyện UEF",
                        Code = "VOLUNTEER",
                        CategoryId = catTinhNguyen,
                        Description =
                            "Câu lạc bộ Tình nguyện — kết nối sinh viên với cộng đồng qua các chương trình từ thiện và bảo vệ môi trường.",
                        ContactInfo = "volunteer@uef.edu.vn",
                        AdvisorName = "ThS. Hoàng Văn Tâm",
                        EstablishedDate = new DateOnly(2019, 4, 1),
                        Status = ClubStatus.Active,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    }
                };
                db.Clubs.AddRange(clubs);
                await db.SaveChangesAsync();
                foreach (var c in clubs) clubMap[c.Code] = c;
            }
            else
            {
                var existingClubs = await db.Clubs.IgnoreQueryFilters().ToListAsync();
                foreach (var c in existingClubs) clubMap[c.Code] = c;
            }
            var clubTech = clubMap["TECH"];
            var clubFootball = clubMap["FOOTBALL"];
            var clubMusic = clubMap["MUSIC"];
            var clubEnglish = clubMap["ENGLISH"];
            var clubVolunteer = clubMap["VOLUNTEER"];

            // ── Departments ───────────────────────────────────────────────
            var deptMap = new Dictionary<string, Department>();
            if (!await db.Departments.IgnoreQueryFilters().AnyAsync())
            {
                var depts = new[]                {
                    // TECH
                    new Department
                    {
                        ClubId = clubTech.Id,
                        Name = "Ban Kỹ thuật",
                        Description = "Phụ trách các dự án lập trình, nghiên cứu kỹ thuật.",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    },
                    new Department
                    {
                        ClubId = clubTech.Id,
                        Name = "Ban Truyền thông",
                        Description = "Quản lý nội dung mạng xã hội và hình ảnh CLB.",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    },
                    new Department
                    {
                        ClubId = clubTech.Id,
                        Name = "Ban Sự kiện",
                        Description = "Tổ chức workshop, hackathon và các sự kiện công nghệ.",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    },
                    // FOOTBALL
                    new Department
                    {
                        ClubId = clubFootball.Id,
                        Name = "Ban Chuyên môn",
                        Description = "Lên kế hoạch tập luyện và chiến thuật thi đấu.",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    },
                    new Department
                    {
                        ClubId = clubFootball.Id,
                        Name = "Ban Hậu cần",
                        Description = "Quản lý trang thiết bị, sân bãi và hậu cần.",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    },
                    // MUSIC
                    new Department
                    {
                        ClubId = clubMusic.Id,
                        Name = "Ban Nhạc cụ",
                        Description = "Phụ trách guitar, piano, trống và các nhạc cụ.",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    },
                    new Department
                    {
                        ClubId = clubMusic.Id,
                        Name = "Ban Thanh nhạc",
                        Description = "Phụ trách ca hát, hòa âm và dàn hợp xướng.",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    },
                    new Department
                    {
                        ClubId = clubMusic.Id,
                        Name = "Ban Sự kiện",
                        Description = "Tổ chức các buổi biểu diễn và concert.",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    }
                };
                db.Departments.AddRange(depts);
                await db.SaveChangesAsync();
                foreach (var d in depts) 
                {
                    var clubCode = clubMap.First(x => x.Value.Id == d.ClubId).Key;
                    deptMap[$"{clubCode}_{d.Name}"] = d;
                }
            }
            else
            {
                var existingDepts = await db.Departments.IgnoreQueryFilters().ToListAsync();
                foreach (var d in existingDepts)
                {
                    var clubCode = clubMap.First(x => x.Value.Id == d.ClubId).Key;
                    deptMap[$"{clubCode}_{d.Name}"] = d;
                }
            }

            // ── Memberships ───────────────────────────────────────────────
            if (!await db.ClubMemberships.AnyAsync())
            {
                var today = DateOnly.FromDateTime(DateTime.Today);

                // Helper lấy dept ID
                int? GetDeptId(string clubCode, string deptName) 
                    => deptMap.TryGetValue($"{clubCode}_{deptName}", out var dept) ? dept.Id : null;

                var memberships = new List<ClubMembership>
                {
                    // CLB Công nghệ — truong là CLUB_ADMIN, linh là DEPT_LEAD Kỹ thuật, an là member
                    new()
                    {
                        UserId = createdUsers["truong.clb@uef.edu.vn"].Id,
                        ClubId = clubTech.Id,
                        ClubRole = ClubRole.CLUB_ADMIN,
                        JoinedDate = new DateOnly(2022, 9, 1),
                        Status = MembershipStatus.Active,
                    },
                    new()
                    {
                        UserId = createdUsers["linh.clb@uef.edu.vn"].Id,
                        ClubId = clubTech.Id,
                        ClubRole = ClubRole.DEPT_LEAD,
                        JoinedDate = new DateOnly(2022, 9, 5),
                        Status = MembershipStatus.Active,
                        DepartmentId = GetDeptId("TECH", "Ban Kỹ thuật"),
                    },
                    new()
                    {
                        UserId = createdUsers["linh.clb@uef.edu.vn"].Id,
                        ClubId = clubTech.Id,
                        ClubRole = ClubRole.DEPT_LEAD,
                        JoinedDate = new DateOnly(2023, 9, 10), // Hoặc chọn ngày bất kỳ
                        Status = MembershipStatus.Active,
                        DepartmentId = GetDeptId("TECH", "Ban Truyền thông"),
                    },
                    new()
                    {
                        UserId = createdUsers["linh.clb@uef.edu.vn"].Id,
                        ClubId = clubTech.Id,
                        ClubRole = ClubRole.MEMBER,
                        JoinedDate = new DateOnly(2023, 9, 10), // Hoặc chọn ngày bất kỳ
                        Status = MembershipStatus.Active,
                        DepartmentId = GetDeptId("TECH", "Ban Sự kiện"),
                    },
                    new()
                    {
                        UserId = createdUsers["an.clb@uef.edu.vn"].Id,
                        ClubId = clubTech.Id,
                        ClubRole = ClubRole.MEMBER,
                        JoinedDate = new DateOnly(2023, 1, 10),
                        Status = MembershipStatus.Active,
                        DepartmentId = GetDeptId("TECH", "Ban Truyền thông"),
                    },
                    new()
                    {
                        UserId = createdUsers["khoa.clb@uef.edu.vn"].Id,
                        ClubId = clubTech.Id,
                        ClubRole = ClubRole.MEMBER,
                        JoinedDate = new DateOnly(2023, 3, 1),
                        Status = MembershipStatus.Active,
                    },
                    // CLB Bóng đá — minh là CLUB_ADMIN, duc là DEPT_LEAD Chuyên môn
                    new()
                    {
                        UserId = createdUsers["minh.clb@uef.edu.vn"].Id,
                        ClubId = clubFootball.Id,
                        ClubRole = ClubRole.CLUB_ADMIN,
                        JoinedDate = new DateOnly(2021, 9, 1),
                        Status = MembershipStatus.Active,
                    },
                    new()
                    {
                        UserId = createdUsers["duc.clb@uef.edu.vn"].Id,
                        ClubId = clubFootball.Id,
                        ClubRole = ClubRole.DEPT_LEAD,
                        JoinedDate = new DateOnly(2021, 9, 5),
                        Status = MembershipStatus.Active,
                        DepartmentId = GetDeptId("FOOTBALL", "Ban Chuyên môn"),
                    },
                    new()
                    {
                        UserId = createdUsers["khoa.clb@uef.edu.vn"].Id,
                        ClubId = clubFootball.Id,
                        ClubRole = ClubRole.MEMBER,
                        JoinedDate = new DateOnly(2022, 2, 1),
                        Status = MembershipStatus.Active,
                    },
                    // CLB Âm nhạc — hoa là CLUB_ADMIN, mai là DEPT_LEAD Thanh nhạc
                    new()
                    {
                        UserId = createdUsers["hoa.clb@uef.edu.vn"].Id,
                        ClubId = clubMusic.Id,
                        ClubRole = ClubRole.CLUB_ADMIN,
                        JoinedDate = new DateOnly(2022, 1, 1),
                        Status = MembershipStatus.Active,
                    },
                    new()
                    {
                        UserId = createdUsers["mai.clb@uef.edu.vn"].Id,
                        ClubId = clubMusic.Id,
                        ClubRole = ClubRole.DEPT_LEAD,
                        JoinedDate = new DateOnly(2022, 1, 10),
                        Status = MembershipStatus.Active,
                        DepartmentId = GetDeptId("MUSIC", "Ban Thanh nhạc"),
                    },
                    new()
                    {
                        UserId = createdUsers["thu.clb@uef.edu.vn"].Id,
                        ClubId = clubMusic.Id,
                        ClubRole = ClubRole.MEMBER,
                        JoinedDate = new DateOnly(2022, 6, 1),
                        Status = MembershipStatus.Active,
                    },
                    new()
                    {
                        UserId = createdUsers["an.clb@uef.edu.vn"].Id,
                        ClubId = clubMusic.Id,
                        ClubRole = ClubRole.MEMBER,
                        JoinedDate = new DateOnly(2023, 1, 5),
                        Status = MembershipStatus.Active,
                    },
                    // CLB Tiếng Anh — thu là CLUB_ADMIN
                    new()
                    {
                        UserId = createdUsers["thu.clb@uef.edu.vn"].Id,
                        ClubId = clubEnglish.Id,
                        ClubRole = ClubRole.CLUB_ADMIN,
                        JoinedDate = new DateOnly(2021, 6, 1),
                        Status = MembershipStatus.Active,
                    },
                    new()
                    {
                        UserId = createdUsers["linh.clb@uef.edu.vn"].Id,
                        ClubId = clubEnglish.Id,
                        ClubRole = ClubRole.DEPT_LEAD,
                        JoinedDate = new DateOnly(2021, 6, 5),
                        Status = MembershipStatus.Active,
                        DepartmentId = GetDeptId("ENGLISH", "Ban Đào tạo"),
                    },
                    new()
                    {
                        UserId = createdUsers["hoa.clb@uef.edu.vn"].Id,
                        ClubId = clubEnglish.Id,
                        ClubRole = ClubRole.MEMBER,
                        JoinedDate = new DateOnly(2022, 9, 1),
                        Status = MembershipStatus.Active,
                    },
                    // CLB Tình nguyện — mai là CLUB_ADMIN
                    new()
                    {
                        UserId = createdUsers["mai.clb@uef.edu.vn"].Id,
                        ClubId = clubVolunteer.Id,
                        ClubRole = ClubRole.CLUB_ADMIN,
                        JoinedDate = new DateOnly(2023, 1, 1),
                        Status = MembershipStatus.Active,
                    },
                    new()
                    {
                        UserId = createdUsers["duc.clb@uef.edu.vn"].Id,
                        ClubId = clubVolunteer.Id,
                        ClubRole = ClubRole.DEPT_LEAD,
                        JoinedDate = new DateOnly(2023, 1, 10),
                        Status = MembershipStatus.Active,
                        DepartmentId = GetDeptId("VOLUNTEER", "Ban Dự án"),
                    },
                    new()
                    {
                        UserId = createdUsers["minh.clb@uef.edu.vn"].Id,
                        ClubId = clubVolunteer.Id,
                        ClubRole = ClubRole.MEMBER,
                        JoinedDate = new DateOnly(2023, 3, 1),
                        Status = MembershipStatus.Active,
                    },
                };

                db.ClubMemberships.AddRange(memberships);
                await db.SaveChangesAsync();
            }

            // ── Probation members ─────────────────────────────────────────
            if (!await db.ClubMemberships.AnyAsync(m => m.Status == MembershipStatus.Probation))
            {
                var allClubs = await db.Clubs.IgnoreQueryFilters().ToListAsync();
                var clubTechId = allClubs.First(c => c.Code == "TECH").Id;
                var clubMusicId = allClubs.First(c => c.Code == "MUSIC").Id;
                var clubEnglishId = allClubs.First(c => c.Code == "ENGLISH").Id;

                db.ClubMemberships.AddRange(
                    new ClubMembership
                    {
                        UserId = createdUsers["duc.clb@uef.edu.vn"].Id,
                        ClubId = clubTechId,
                        ClubRole = ClubRole.MEMBER,
                        JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-14)),
                        Status = MembershipStatus.Probation,
                    },
                    new ClubMembership
                    {
                        UserId = createdUsers["thu.clb@uef.edu.vn"].Id,
                        ClubId = clubTechId,
                        ClubRole = ClubRole.MEMBER,
                        JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-7)),
                        Status = MembershipStatus.Probation,
                    },
                    new ClubMembership
                    {
                        UserId = createdUsers["khoa.clb@uef.edu.vn"].Id,
                        ClubId = clubMusicId,
                        ClubRole = ClubRole.MEMBER,
                        JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-10)),
                        Status = MembershipStatus.Probation,
                    },
                    new ClubMembership
                    {
                        UserId = createdUsers["an.clb@uef.edu.vn"].Id,
                        ClubId = clubEnglishId,
                        ClubRole = ClubRole.MEMBER,
                        JoinedDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-5)),
                        Status = MembershipStatus.Probation,
                    }
                );
                await db.SaveChangesAsync();
            }

            // ── Resigned members ──────────────────────────────────────────
            if (!await db.ClubMemberships.AnyAsync(m => m.Status == MembershipStatus.Resigned))
            {
                var resignedClubs = await db.Clubs.IgnoreQueryFilters().ToListAsync();
                var clubTechId = resignedClubs.First(c => c.Code == "TECH").Id;
                var clubFootballId = resignedClubs.First(c => c.Code == "FOOTBALL").Id;

                db.ClubMemberships.AddRange(
                    new ClubMembership
                    {
                        UserId = createdUsers["mai.clb@uef.edu.vn"].Id,
                        ClubId = clubTechId,
                        ClubRole = ClubRole.MEMBER,
                        JoinedDate = new DateOnly(2022, 9, 1),
                        ResignedDate = new DateOnly(2023, 6, 30),
                        Status = MembershipStatus.Resigned,
                    },
                    new ClubMembership
                    {
                        UserId = createdUsers["thu.clb@uef.edu.vn"].Id,
                        ClubId = clubFootballId,
                        ClubRole = ClubRole.MEMBER,
                        JoinedDate = new DateOnly(2021, 9, 1),
                        ResignedDate = new DateOnly(2022, 12, 31),
                        Status = MembershipStatus.Resigned,
                    }
                );
                await db.SaveChangesAsync();
            }

            // ── Club Positions & Permissions ─────────────────────────────
            // Demo data for the flexible position/permission model. This is intentionally
            // idempotent and only adds missing permissions so admin edits are not wiped.
            {
                int? GetDeptId(string clubCode, string deptName)
                    => deptMap.TryGetValue($"{clubCode}_{deptName}", out var dept) ? dept.Id : null;

                async Task<ClubPosition> EnsurePositionAsync(
                    Club club,
                    int? departmentId,
                    string name,
                    string description,
                    bool isDefault,
                    bool canBeAssignedByDeptLead,
                    params string[] permissionCodes)
                {
                    var position = await db.ClubPositions
                        .IgnoreQueryFilters()
                        .Where(p =>
                            p.ClubId == club.Id &&
                            p.DepartmentId == departmentId &&
                            p.Name == name)
                        .OrderBy(p => p.IsDeleted ? 1 : 0)
                        .FirstOrDefaultAsync();

                    if (position == null)
                    {
                        position = new ClubPosition
                        {
                            ClubId = club.Id,
                            DepartmentId = departmentId,
                            Name = name,
                            Description = description,
                            IsDefault = isDefault,
                            CanBeAssignedByDeptLead = canBeAssignedByDeptLead,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow,
                        };
                        db.ClubPositions.Add(position);
                        await db.SaveChangesAsync();
                    }
                    else
                    {
                        position.Description = description;
                        position.IsDefault = isDefault;
                        position.CanBeAssignedByDeptLead = canBeAssignedByDeptLead;
                        position.IsDeleted = false;
                        position.DeletedBy = null;
                        position.UpdatedAt = DateTime.UtcNow;
                        await db.SaveChangesAsync();
                    }

                    var targetCodes = permissionCodes
                        .Where(ClubPermissions.IsKnown)
                        .Distinct(StringComparer.OrdinalIgnoreCase)
                        .ToList();

                    var existingCodes = await db.ClubPositionPermissions
                        .IgnoreQueryFilters()
                        .Where(p => p.PositionId == position.Id)
                        .Select(p => p.PermissionCode)
                        .ToListAsync();

                    var existingSet = existingCodes.ToHashSet(StringComparer.OrdinalIgnoreCase);
                    var missing = targetCodes
                        .Where(code => !existingSet.Contains(code))
                        .Select(code => new ClubPositionPermission
                        {
                            PositionId = position.Id,
                            PermissionCode = code,
                        })
                        .ToList();

                    if (missing.Count > 0)
                    {
                        db.ClubPositionPermissions.AddRange(missing);
                        await db.SaveChangesAsync();
                    }

                    return position;
                }

                async Task AssignPositionAsync(string email, Club club, int? departmentId, ClubPosition position)
                {
                    if (!createdUsers.TryGetValue(email, out var user))
                        return;

                    var membership = await db.ClubMemberships
                        .Where(m =>
                            m.UserId == user.Id &&
                            m.ClubId == club.Id &&
                            m.DepartmentId == departmentId &&
                            (m.Status == MembershipStatus.Active || m.Status == MembershipStatus.Probation))
                        .OrderBy(m => m.Status == MembershipStatus.Active ? 0 : 1)
                        .ThenBy(m => m.Id)
                        .FirstOrDefaultAsync();

                    if (membership == null)
                        return;

                    var exists = await db.ClubMemberPositions.AnyAsync(p =>
                        p.MembershipId == membership.Id && p.PositionId == position.Id);

                    if (!exists)
                    {
                        db.ClubMemberPositions.Add(new ClubMemberPosition
                        {
                            MembershipId = membership.Id,
                            PositionId = position.Id,
                            AssignedAt = DateTime.UtcNow,
                            AssignedBy = "seeder",
                        });
                        await db.SaveChangesAsync();
                    }
                }

                var techDeptId = GetDeptId("TECH", "Ban Kỹ thuật");
                var mediaDeptId = GetDeptId("TECH", "Ban Truyền thông");
                var eventDeptId = GetDeptId("TECH", "Ban Sự kiện");

                var clubPresident = await EnsurePositionAsync(
                    clubTech,
                    null,
                    "Chủ nhiệm CLB",
                    "Điều phối toàn bộ hoạt động, nhân sự, tuyển thành viên và cấu hình CLB.",
                    isDefault: true,
                    canBeAssignedByDeptLead: false,
                    ClubPermissions.MembersView,
                    ClubPermissions.MembersManage,
                    ClubPermissions.MemberHistoryView,
                    ClubPermissions.MemberLifecycleManage,
                    ClubPermissions.MemberImportExport,
                    ClubPermissions.DepartmentsManage,
                    ClubPermissions.ApplicationsView,
                    ClubPermissions.ApplicationsReview,
                    ClubPermissions.RecruitmentPipelineManage,
                    ClubPermissions.RecruitmentFormManage,
                    ClubPermissions.ResignationsView,
                    ClubPermissions.ResignationsReview,
                    ClubPermissions.OrgChartView,
                    ClubPermissions.OrgChartManage,
                    ClubPermissions.PositionsManage,
                    ClubPermissions.PositionAssignmentsManage,
                    ClubPermissions.ReportsView,
                    ClubPermissions.ReportsExport,
                    ClubPermissions.RoleSuggestionsUse,
                    ClubPermissions.ClubSettingsManage,
                    ClubPermissions.ClubAuditLogView,
                    ClubPermissions.ClubProfileManage,
                    ClubPermissions.NotificationSettingsManage,
                    ClubPermissions.NotificationsView,
                    ClubPermissions.OperationsDashboardView,
                    ClubPermissions.TasksView,
                    ClubPermissions.TasksManage,
                    ClubPermissions.SprintsManage,
                    ClubPermissions.EventsView,
                    ClubPermissions.EventsManage,
                    ClubPermissions.EventParticipantsManage,
                    ClubPermissions.WorkloadView,
                    ClubPermissions.PortalLandingPageManage,
                    ClubPermissions.PortalContentView,
                    ClubPermissions.PortalContentManage,
                    ClubPermissions.PortalContentReview,
                    ClubPermissions.PortalMediaManage,
                    ClubPermissions.PortalAnalyticsView,
                    ClubPermissions.PortalSocialManage);

                var vicePresident = await EnsurePositionAsync(
                    clubTech,
                    null,
                    "Phó chủ nhiệm",
                    "Hỗ trợ chủ nhiệm điều phối nhân sự, sự kiện và vận hành CLB.",
                    isDefault: true,
                    canBeAssignedByDeptLead: false,
                    ClubPermissions.MembersView,
                    ClubPermissions.MembersManage,
                    ClubPermissions.ApplicationsView,
                    ClubPermissions.ApplicationsReview,
                    ClubPermissions.ResignationsView,
                    ClubPermissions.OrgChartView,
                    ClubPermissions.PositionAssignmentsManage,
                    ClubPermissions.ReportsView,
                    ClubPermissions.TasksView,
                    ClubPermissions.TasksManage,
                    ClubPermissions.EventsView,
                    ClubPermissions.EventsManage,
                    ClubPermissions.NotificationsView);

                var treasurer = await EnsurePositionAsync(
                    clubTech,
                    null,
                    "Thủ quỹ",
                    "Theo dõi thu chi, xuất báo cáo và hỗ trợ tổng kết sự kiện.",
                    isDefault: false,
                    canBeAssignedByDeptLead: false,
                    ClubPermissions.ReportsView,
                    ClubPermissions.ReportsExport,
                    ClubPermissions.EventsView,
                    ClubPermissions.EventParticipantsManage,
                    ClubPermissions.NotificationsView);

                var techLead = await EnsurePositionAsync(
                    clubTech,
                    techDeptId,
                    "Trưởng ban Kỹ thuật",
                    "Quản lý thành viên, task và sprint của Ban Kỹ thuật.",
                    isDefault: true,
                    canBeAssignedByDeptLead: false,
                    ClubPermissions.MembersView,
                    ClubPermissions.TasksView,
                    ClubPermissions.TasksManage,
                    ClubPermissions.SprintsManage,
                    ClubPermissions.WorkloadView,
                    ClubPermissions.EventsView,
                    ClubPermissions.OrgChartView,
                    ClubPermissions.PositionAssignmentsManage,
                    ClubPermissions.NotificationsView);

                var developerLead = await EnsurePositionAsync(
                    clubTech,
                    techDeptId,
                    "Tech Lead",
                    "Dẫn dắt nhóm kỹ thuật theo từng dự án hoặc sprint.",
                    isDefault: false,
                    canBeAssignedByDeptLead: true,
                    ClubPermissions.TasksView,
                    ClubPermissions.TasksManage,
                    ClubPermissions.SprintsManage,
                    ClubPermissions.WorkloadView);

                var developer = await EnsurePositionAsync(
                    clubTech,
                    techDeptId,
                    "Developer",
                    "Tham gia phát triển sản phẩm, workshop kỹ thuật và task được giao.",
                    isDefault: false,
                    canBeAssignedByDeptLead: true,
                    ClubPermissions.TasksView,
                    ClubPermissions.EventsView);

                var mediaLead = await EnsurePositionAsync(
                    clubTech,
                    mediaDeptId,
                    "Trưởng ban Truyền thông",
                    "Quản lý nội dung, media và lịch truyền thông của CLB.",
                    isDefault: true,
                    canBeAssignedByDeptLead: false,
                    ClubPermissions.MembersView,
                    ClubPermissions.PortalContentView,
                    ClubPermissions.PortalContentManage,
                    ClubPermissions.PortalContentReview,
                    ClubPermissions.PortalMediaManage,
                    ClubPermissions.PortalSocialManage,
                    ClubPermissions.TasksView,
                    ClubPermissions.TasksManage,
                    ClubPermissions.PositionAssignmentsManage,
                    ClubPermissions.NotificationsView);

                var contentWriter = await EnsurePositionAsync(
                    clubTech,
                    mediaDeptId,
                    "Content Writer",
                    "Viết bài, cập nhật nội dung và phối hợp đăng tải truyền thông.",
                    isDefault: false,
                    canBeAssignedByDeptLead: true,
                    ClubPermissions.PortalContentView,
                    ClubPermissions.PortalContentManage,
                    ClubPermissions.PortalMediaManage,
                    ClubPermissions.TasksView);

                var designer = await EnsurePositionAsync(
                    clubTech,
                    mediaDeptId,
                    "Designer",
                    "Thiết kế hình ảnh, banner và media cho bài viết/sự kiện.",
                    isDefault: false,
                    canBeAssignedByDeptLead: true,
                    ClubPermissions.PortalMediaManage,
                    ClubPermissions.TasksView);

                var eventLead = await EnsurePositionAsync(
                    clubTech,
                    eventDeptId,
                    "Trưởng ban Sự kiện",
                    "Lên kế hoạch, phân công và quản lý người tham gia sự kiện.",
                    isDefault: true,
                    canBeAssignedByDeptLead: false,
                    ClubPermissions.EventsView,
                    ClubPermissions.EventsManage,
                    ClubPermissions.EventParticipantsManage,
                    ClubPermissions.TasksView,
                    ClubPermissions.TasksManage,
                    ClubPermissions.PositionAssignmentsManage,
                    ClubPermissions.NotificationsView);

                var eventCoordinator = await EnsurePositionAsync(
                    clubTech,
                    eventDeptId,
                    "Event Coordinator",
                    "Điều phối timeline, nhân sự và hạng mục chuẩn bị sự kiện.",
                    isDefault: false,
                    canBeAssignedByDeptLead: true,
                    ClubPermissions.EventsView,
                    ClubPermissions.EventsManage,
                    ClubPermissions.EventParticipantsManage,
                    ClubPermissions.TasksView);

                var logistics = await EnsurePositionAsync(
                    clubTech,
                    eventDeptId,
                    "Hậu cần sự kiện",
                    "Chuẩn bị vật dụng, địa điểm và hỗ trợ vận hành sự kiện.",
                    isDefault: false,
                    canBeAssignedByDeptLead: true,
                    ClubPermissions.EventsView,
                    ClubPermissions.TasksView);

                await AssignPositionAsync("truong.clb@uef.edu.vn", clubTech, null, clubPresident);
                await AssignPositionAsync("khoa.clb@uef.edu.vn", clubTech, null, treasurer);
                await AssignPositionAsync("linh.clb@uef.edu.vn", clubTech, techDeptId, techLead);
                await AssignPositionAsync("linh.clb@uef.edu.vn", clubTech, techDeptId, developerLead);
                await AssignPositionAsync("linh.clb@uef.edu.vn", clubTech, mediaDeptId, mediaLead);
                await AssignPositionAsync("linh.clb@uef.edu.vn", clubTech, eventDeptId, eventCoordinator);
                await AssignPositionAsync("an.clb@uef.edu.vn", clubTech, mediaDeptId, contentWriter);
                await AssignPositionAsync("an.clb@uef.edu.vn", clubTech, mediaDeptId, designer);
                _ = vicePresident;
                _ = developer;
                _ = eventLead;
                _ = logistics;
            }

            // ── Resignation requests ──────────────────────────────────────
            if (!await db.ResignationRequests.AnyAsync())
            {
                var techClubId = (await db.Clubs.IgnoreQueryFilters().FirstAsync(c => c.Code == "TECH")).Id;
                var techAdminId = createdUsers["truong.clb@uef.edu.vn"].Id;
                var linhId = createdUsers["linh.clb@uef.edu.vn"].Id;

                var linhTechLeadMemberships = await db.ClubMemberships
                    .Where(m =>
                        m.ClubId == techClubId &&
                        m.UserId == linhId &&
                        m.ClubRole == ClubRole.DEPT_LEAD)
                    .OrderBy(m => m.DepartmentId)
                    .ToListAsync();

                if (linhTechLeadMemberships.Count > 0)
                {
                    db.ResignationRequests.Add(new ResignationRequest
                    {
                        UserId = linhId,
                        ClubId = techClubId,
                        MembershipId = linhTechLeadMemberships[0].Id,
                        Preference = ResignationPreference.BecomeMember,
                        Status = ResignationStatus.Pending,
                        RequestedAt = DateTime.UtcNow.AddDays(-2),
                        ReviewNote = "Em muốn chuyển xuống thành viên thường để tập trung học kỳ này.",
                    });
                }

                if (linhTechLeadMemberships.Count > 1)
                {
                    db.ResignationRequests.Add(new ResignationRequest
                    {
                        UserId = linhId,
                        ClubId = techClubId,
                        MembershipId = linhTechLeadMemberships[1].Id,
                        Preference = ResignationPreference.LeaveClub,
                        Status = ResignationStatus.Approved,
                        RequestedAt = DateTime.UtcNow.AddDays(-12),
                        ReviewedAt = DateTime.UtcNow.AddDays(-10),
                        ReviewerId = techAdminId,
                        ReviewNote = "Đã trao đổi và thống nhất bàn giao công việc truyền thông.",
                    });
                }

                await db.SaveChangesAsync();
            }

            // ── Notifications ─────────────────────────────────────────────
            if (!await db.Notifications.AnyAsync(n => n.UserId == createdUsers["truong.clb@uef.edu.vn"].Id))
            {
                var techAdminId = createdUsers["truong.clb@uef.edu.vn"].Id;
                db.Notifications.AddRange(
                    new Notification
                    {
                        UserId = techAdminId,
                        Title = "Có đơn từ chức mới",
                        Message = "Phạm Thị Linh đã gửi đơn xin chuyển xuống thành viên thường tại CLB Công nghệ UEF.",
                        Type = NotificationType.System,
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow.AddMinutes(-25),
                    },
                    new Notification
                    {
                        UserId = techAdminId,
                        Title = "Có đơn đăng ký mới",
                        Message = "CLB Công nghệ UEF vừa nhận thêm một đơn đăng ký cần xem xét.",
                        Type = NotificationType.Application,
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow.AddHours(-3),
                    },
                    new Notification
                    {
                        UserId = techAdminId,
                        Title = "Nhắc kiểm tra báo cáo thành viên",
                        Message = "Bạn có thể xuất danh sách thành viên CLB Công nghệ UEF để rà soát dữ liệu demo.",
                        Type = NotificationType.System,
                        IsRead = true,
                        CreatedAt = DateTime.UtcNow.AddDays(-1),
                    }
                );
                await db.SaveChangesAsync();
            }

            // ── Applications ──────────────────────────────────────────────
            if (!await db.Applications.AnyAsync())
            {
                var appClubs = await db.Clubs.IgnoreQueryFilters().ToListAsync();
                var clubTechId = appClubs.First(c => c.Code == "TECH").Id;
                var clubMusicId = appClubs.First(c => c.Code == "MUSIC").Id;
                var clubVolunteerId = appClubs.First(c => c.Code == "VOLUNTEER").Id;

                static string J(string note) =>
                    System.Text.Json.JsonSerializer.Serialize(new { note });

                db.Applications.AddRange(
                    // Pending — chờ duyệt
                    new ClubApplication
                    {
                        UserId = createdUsers["duc.clb@uef.edu.vn"].Id,
                        ClubId = clubMusicId,
                        Status = ApplicationStatus.Pending,
                        AppliedAt = DateTime.UtcNow.AddDays(-3),
                        Answers = J("Tôi rất đam mê âm nhạc và muốn được học hỏi thêm."),
                    },
                    new ClubApplication
                    {
                        UserId = createdUsers["khoa.clb@uef.edu.vn"].Id,
                        ClubId = clubVolunteerId,
                        Status = ApplicationStatus.Pending,
                        AppliedAt = DateTime.UtcNow.AddDays(-1),
                        Answers = J("Tôi muốn đóng góp cho cộng đồng và phát triển kỹ năng mềm."),
                    },
                    // Interview — được mời phỏng vấn
                    new ClubApplication
                    {
                        UserId = createdUsers["mai.clb@uef.edu.vn"].Id,
                        ClubId = clubVolunteerId,
                        Status = ApplicationStatus.Interview,
                        AppliedAt = DateTime.UtcNow.AddDays(-7),
                        Answers = J("Tôi từng tham gia nhiều hoạt động từ thiện tại địa phương."),
                    },
                    // Accepted
                    new ClubApplication
                    {
                        UserId = createdUsers["duc.clb@uef.edu.vn"].Id,
                        ClubId = clubTechId,
                        Status = ApplicationStatus.Accepted,
                        AppliedAt = DateTime.UtcNow.AddDays(-20),
                        Answers = J("Tôi có kinh nghiệm lập trình web và muốn tham gia các dự án của CLB."),
                    },
                    new ClubApplication
                    {
                        UserId = createdUsers["thu.clb@uef.edu.vn"].Id,
                        ClubId = clubTechId,
                        Status = ApplicationStatus.Accepted,
                        AppliedAt = DateTime.UtcNow.AddDays(-14),
                        Answers = J("Tôi muốn cải thiện kỹ năng lập trình và networking."),
                    },
                    // Rejected
                    new ClubApplication
                    {
                        UserId = createdUsers["an.clb@uef.edu.vn"].Id,
                        ClubId = clubMusicId,
                        Status = ApplicationStatus.Rejected,
                        AppliedAt = DateTime.UtcNow.AddDays(-30),
                        Answers = J("Tôi muốn học đàn guitar."),
                    }
                );
                await db.SaveChangesAsync();
            }

            // ── System Settings ───────────────────────────────────────────
            if (!await db.SystemSettings.AnyAsync())
            {
                db.SystemSettings.AddRange(
                    new SystemSetting { Key = "auth.allowed_domains",       Category = "auth",   InputType = "tags",   Label = "Domain email được phép đăng ký",    Description = "Danh sách domain hợp lệ (vd: uef.edu.vn). Để trống = cho phép tất cả.", Value = "" },
                    new SystemSetting { Key = "auth.registration_open",     Category = "auth",   InputType = "toggle", Label = "Cho phép đăng ký tài khoản mới",    Description = "Tắt để tạm ngừng đăng ký toàn hệ thống.", Value = "true" },
                    new SystemSetting { Key = "club.max_members",           Category = "club",   InputType = "number", Label = "Số thành viên tối đa mỗi CLB",      Description = "0 = không giới hạn.", Value = "0" },
                    new SystemSetting { Key = "club.max_departments",       Category = "club",   InputType = "number", Label = "Số ban tối đa mỗi CLB",             Description = "0 = không giới hạn.", Value = "0" },
                    new SystemSetting { Key = "club.default_departments",   Category = "club",   InputType = "tags",   Label = "Ban mặc định khi tạo CLB mới",      Description = "Tự động tạo các ban này khi thêm CLB. Để trống = không tạo tự động.", Value = "" },
                    new SystemSetting { Key = "system.app_name",            Category = "system", InputType = "text",   Label = "Tên hệ thống",                      Description = "Hiển thị trên email và tiêu đề trang.", Value = "UniClub Hub" },
                    new SystemSetting { Key = "system.support_email",       Category = "system", InputType = "text",   Label = "Email hỗ trợ",                      Description = "Email nhận phản hồi từ người dùng.", Value = "" },
                    new SystemSetting { Key = "system.university_name",     Category = "system", InputType = "text",   Label = "Tên trường đại học",                Description = "Hiển thị trên landing page và footer.", Value = "Đại học Kinh tế Tài chính TP.HCM" },
                    new SystemSetting { Key = "system.logo_url",            Category = "system", InputType = "text",   Label = "URL Logo hệ thống",                 Description = "Dùng trong email. Để trống = dùng logo mặc định (U!).", Value = "" },
                    // ── Notification message templates ────────────────────────
                    new SystemSetting { Key = "notification.msg.application_new",             Category = "notification", InputType = "textarea", Label = "Đơn mới gửi đến (admin CLB)",            Description = "Biến: {{clubName}}",                  Value = "Có đơn đăng ký mới vào CLB {{clubName}}." },
                    new SystemSetting { Key = "notification.msg.application_interview",       Category = "notification", InputType = "textarea", Label = "Mời phỏng vấn (người nộp đơn)",          Description = "Biến: {{clubName}}",                  Value = "Đơn đăng ký vào CLB {{clubName}} của bạn được mời phỏng vấn." },
                    new SystemSetting { Key = "notification.msg.application_accepted",        Category = "notification", InputType = "textarea", Label = "Đơn được chấp nhận (người nộp)",         Description = "Biến: {{clubName}}",                  Value = "Chúc mừng! Bạn đã được chấp nhận vào CLB {{clubName}}." },
                    new SystemSetting { Key = "notification.msg.application_rejected",        Category = "notification", InputType = "textarea", Label = "Đơn bị từ chối (người nộp)",             Description = "Biến: {{clubName}}",                  Value = "Đơn đăng ký vào CLB {{clubName}} của bạn đã bị từ chối." },
                    new SystemSetting { Key = "notification.msg.application_updated",         Category = "notification", InputType = "textarea", Label = "Đơn được cập nhật (người nộp)",          Description = "Biến: {{clubName}}",                  Value = "Đơn đăng ký vào CLB {{clubName}} của bạn đã được cập nhật." },
                    new SystemSetting { Key = "notification.msg.member_promoted",             Category = "notification", InputType = "textarea", Label = "Thành viên chính thức",                  Description = "Không có biến",                       Value = "Chúc mừng! Bạn đã được xác nhận là thành viên chính thức." },
                    new SystemSetting { Key = "notification.msg.member_admin_assigned",       Category = "notification", InputType = "textarea", Label = "Bổ nhiệm Trưởng CLB",                    Description = "Biến: {{clubName}}",                  Value = "Bạn đã được bổ nhiệm làm Trưởng câu lạc bộ {{clubName}}." },
                    new SystemSetting { Key = "notification.msg.member_lead_assigned",        Category = "notification", InputType = "textarea", Label = "Bổ nhiệm Trưởng ban",                    Description = "Biến: {{deptName}}, {{clubName}}",    Value = "Bạn đã được bổ nhiệm làm Trưởng {{deptName}} trong CLB {{clubName}}." },
                    new SystemSetting { Key = "notification.msg.member_added",                Category = "notification", InputType = "textarea", Label = "Được thêm vào CLB",                      Description = "Biến: {{clubName}}, {{role}}",        Value = "Bạn đã được thêm vào CLB {{clubName}} với vai trò {{role}}." },
                    new SystemSetting { Key = "notification.msg.member_removed",              Category = "notification", InputType = "textarea", Label = "Bị xóa khỏi CLB",                        Description = "Biến: {{clubName}}",                  Value = "Bạn đã được ghi nhận rời khỏi CLB {{clubName}}." },
                    new SystemSetting { Key = "notification.msg.member_resigned",             Category = "notification", InputType = "textarea", Label = "Tự rời CLB",                             Description = "Biến: {{clubName}}",                  Value = "Bạn đã rời khỏi CLB {{clubName}}." },
                    new SystemSetting { Key = "notification.msg.dept_deleted",                Category = "notification", InputType = "textarea", Label = "Ban bị giải thể (thành viên)",            Description = "Biến: {{deptName}}",                  Value = "Ban \"{{deptName}}\" đã bị xóa. Bạn vẫn là thành viên của CLB và có thể được gán vào ban khác." },
                    new SystemSetting { Key = "notification.msg.resignation_submitted_admin", Category = "notification", InputType = "textarea", Label = "Đơn từ chức Trưởng CLB (người duyệt)",   Description = "Biến: {{memberName}}, {{clubName}}", Value = "{{memberName}} đã gửi đơn từ chức tại CLB {{clubName}}." },
                    new SystemSetting { Key = "notification.msg.resignation_submitted_lead",  Category = "notification", InputType = "textarea", Label = "Đơn từ chức Trưởng ban (admin CLB)",     Description = "Biến: {{memberName}}, {{clubName}}", Value = "{{memberName}} đã gửi đơn từ chức tại CLB {{clubName}}." },
                    new SystemSetting { Key = "notification.msg.resignation_approved_leave",  Category = "notification", InputType = "textarea", Label = "Từ chức được duyệt – rời CLB",            Description = "Biến: {{clubName}}",                  Value = "Đơn từ chức của bạn tại CLB {{clubName}} đã được chấp thuận. Bạn đã rời CLB." },
                    new SystemSetting { Key = "notification.msg.resignation_approved_demote", Category = "notification", InputType = "textarea", Label = "Từ chức được duyệt – xuống thành viên",   Description = "Biến: {{clubName}}",                  Value = "Đơn từ chức của bạn tại CLB {{clubName}} đã được chấp thuận. Bạn đã trở thành thành viên thường." },
                    new SystemSetting { Key = "notification.msg.resignation_rejected",        Category = "notification", InputType = "textarea", Label = "Đơn từ chức bị từ chối",                 Description = "Biến: {{clubName}}",                  Value = "Đơn từ chức của bạn tại CLB {{clubName}} đã bị từ chối." },
                    new SystemSetting { Key = "notification.msg.support_new",                 Category = "notification", InputType = "textarea", Label = "Ticket hỗ trợ mới (super admin)",        Description = "Biến: {{senderName}}, {{subject}}",  Value = "{{senderName}} vừa gửi yêu cầu hỗ trợ: \"{{subject}}\"" },
                    new SystemSetting { Key = "notification.msg.support_inprogress",          Category = "notification", InputType = "textarea", Label = "Ticket đang xử lý (người gửi)",          Description = "Biến: {{subject}}",                   Value = "Yêu cầu hỗ trợ \"{{subject}}\" đang được xử lý." },
                    new SystemSetting { Key = "notification.msg.support_resolved",            Category = "notification", InputType = "textarea", Label = "Ticket đã giải quyết (người gửi)",       Description = "Biến: {{subject}}",                   Value = "Yêu cầu hỗ trợ \"{{subject}}\" đã được giải quyết." }
                );
                await db.SaveChangesAsync();
            }

            // ── Contact page settings (idempotent) ────────────────────────────
            var faqDefault = System.Text.Json.JsonSerializer.Serialize(new object[]
            {
                new { q = "Làm sao tham gia CLB?", a = "Vào trang Câu lạc bộ → chọn CLB → nhấn Nộp đơn. Sau khi nộp đơn, ban tuyển thành viên sẽ liên hệ lại trong vòng 3-5 ngày làm việc." },
                new { q = "Quên mật khẩu phải làm sao?", a = "Bấm \"Quên?\" ở trang đăng nhập, nhập email tài khoản — hệ thống sẽ gửi link đặt lại mật khẩu trong vòng vài phút." },
                new { q = "Muốn tạo CLB mới thì liên hệ ai?", a = "Liên hệ Phòng Công tác Sinh viên qua form trên hoặc đến trực tiếp Lầu 3, Toà nhà A. Cần chuẩn bị đề án thành lập CLB theo mẫu." },
                new { q = "Một sinh viên có thể tham gia bao nhiêu CLB?", a = "Không giới hạn số lượng CLB, nhưng khuyến khích tham gia tối đa 2-3 CLB để đảm bảo chất lượng đóng góp." },
                new { q = "Làm sao để rời CLB?", a = "Đăng nhập vào hệ thống, vào trang \"Hoạt động của tôi\" → chọn CLB → gửi đơn xin rút lui. Trưởng CLB sẽ xử lý trong 5 ngày làm việc." },
            });
            (string Key, string Cat, string Type, string Label, string Desc, string Val)[] contactSettings =
            [
                ("contact.office_name",    "contact", "text",     "Tên văn phòng",           "Dòng đầu trong thẻ Văn phòng.",             "Phòng Công tác Sinh viên"),
                ("contact.office_address", "contact", "textarea", "Địa chỉ văn phòng",       "Hiển thị dưới tên văn phòng.",              "Lầu 3, Toà nhà A\n276 Điện Biên Phủ, Quận 3, TP.HCM"),
                ("contact.email",          "contact", "text",     "Email liên hệ",            "Email hiển thị trên trang liên hệ.",        "clb@uef.edu.vn"),
                ("contact.email_note",     "contact", "text",     "Ghi chú email",            "Ví dụ: Phản hồi trong 24h.",               "Phản hồi trong vòng 24 giờ làm việc."),
                ("contact.hours_label",    "contact", "text",     "Giờ làm việc (tiêu đề)",  "Ví dụ: Thứ 2 — Thứ 6.",                    "Thứ 2 — Thứ 6"),
                ("contact.hours_detail",   "contact", "text",     "Giờ làm việc (chi tiết)", "Ví dụ: 8:00 — 17:00 · Trừ ngày lễ.",      "8:00 — 17:00 · Trừ ngày lễ"),
                ("contact.faq",            "contact", "faq",      "Câu hỏi thường gặp (FAQ)","Danh sách câu hỏi và trả lời trên trang liên hệ.", faqDefault),
            ];
            foreach (var (key, cat, type, label, desc, val) in contactSettings)
            {
                if (!await db.SystemSettings.AnyAsync(s => s.Key == key))
                    db.SystemSettings.Add(new SystemSetting { Key = key, Category = cat, InputType = type, Label = label, Description = desc, Value = val });
            }
            await db.SaveChangesAsync();

            // ── Landing page & Footer settings (idempotent) ───────────────────
            var landingSliderDefault = """
            [
              {
                "eyebrow": "Spotlight tuần này",
                "title": "Workshop, tuyển thành viên và sân chơi mới trong một nơi.",
                "description": "Dùng khu vực này để admin ghim banner quan trọng, ảnh sự kiện hoặc thông báo nổi bật trên trang chủ.",
                "ctaLabel": "Xem hoạt động",
                "ctaHref": "/clubs",
                "accent": "#1b4fd8"
              },
              {
                "eyebrow": "Dành cho tân sinh viên",
                "title": "Tìm CLB hợp gu trước khi bỏ lỡ mùa tuyển quân.",
                "description": "Slider có thể đổi nội dung theo từng đợt tuyển thành viên, tuần lễ định hướng hoặc sự kiện cấp trường.",
                "ctaLabel": "Khám phá CLB",
                "ctaHref": "/clubs",
                "accent": "#ed1b2f"
              }
            ]
            """;
            (string Key, string Cat, string Type, string Label, string Desc, string Val)[] publicSettings =
            [
                ("landing.banner_enabled", "landing", "toggle", "Hiển thị banner thông báo",   "Bật để hiện banner ở đầu trang chủ.",                                  "false"),
                ("landing.banner_text",    "landing", "text",   "Nội dung banner",              "Ví dụ: Đang mở đơn tuyển thành viên học kỳ 2/2026!",                   ""),
                ("landing.banner_color",   "landing", "text",   "Màu nền banner (hex)",         "Ví dụ: #f59e0b (vàng), #4f46e5 (tím), #10b981 (xanh), #ef4444 (đỏ).", "#f59e0b"),
                ("landing.slider_enabled", "landing", "toggle", "Hiển thị slider nổi bật",      "Bật để hiện section slider giữa hoạt động mới và danh sách CLB.",      "true"),
                ("landing.slider_items",   "landing", "textarea","Nội dung slider nổi bật",      "JSON array: eyebrow, title, description, imageUrl, ctaLabel, ctaHref, accent.", landingSliderDefault),
                ("footer.facebook_url",    "footer",  "text",   "Link Facebook",                "URL trang Facebook của trường/phòng CTSV. Để trống = ẩn icon.",         ""),
                ("footer.instagram_url",   "footer",  "text",   "Link Instagram",               "URL trang Instagram. Để trống = ẩn icon.",                             ""),
                ("footer.tiktok_url",      "footer",  "text",   "Link TikTok",                  "URL trang TikTok. Để trống = ẩn icon.",                                ""),
                ("footer.youtube_url",     "footer",  "text",   "Link YouTube",                 "URL kênh YouTube. Để trống = ẩn icon.",                                ""),
                ("footer.x_url",           "footer",  "text",   "Link X (Twitter)",             "URL trang X/Twitter. Để trống = ẩn icon.",                             ""),
                ("footer.linkedin_url",    "footer",  "text",   "Link LinkedIn",                "URL trang LinkedIn. Để trống = ẩn icon.",                              ""),
                ("footer.address",         "footer",  "text",   "Địa chỉ hiển thị trong footer","Ví dụ: 276 Điện Biên Phủ, Q.3, TP.HCM",                               ""),
            ];
            foreach (var (key, cat, type, label, desc, val) in publicSettings)
            {
                if (!await db.SystemSettings.AnyAsync(s => s.Key == key))
                    db.SystemSettings.Add(new SystemSetting { Key = key, Category = cat, InputType = type, Label = label, Description = desc, Value = val });
            }
            await db.SaveChangesAsync();

            // ── Notification Preferences (global defaults) ────────────────
            await NotificationPreferenceSeeder.SeedDefaultsAsync(db);

            // ── KPI demo data ─────────────────────────────────────────────
            // Seed dữ liệu đủ để test nhanh KPI config/results/my-kpi trong môi trường dev.
            // Idempotent theo marker trong Title/Note để chạy lại app không tạo trùng task.
            {
                static List<KpiCriteria> DefaultKpiCriteria() =>
                [
                    new()
                    {
                        MetricKey = KpiMetricKey.TaskCompletion,
                        DisplayName = "Hoàn thành công việc",
                        Description = "Tỷ lệ task đã hoàn thành trên tổng task được giao trong kỳ.",
                        Weight = 35,
                        IsEnabled = true,
                    },
                    new()
                    {
                        MetricKey = KpiMetricKey.OnTimeCompletion,
                        DisplayName = "Hoàn thành đúng hạn",
                        Description = "Tỷ lệ task hoàn thành trước hoặc đúng deadline.",
                        Weight = 25,
                        IsEnabled = true,
                    },
                    new()
                    {
                        MetricKey = KpiMetricKey.AvgProgress,
                        DisplayName = "Tiến độ trung bình",
                        Description = "Tiến độ trung bình của các task trong kỳ.",
                        Weight = 15,
                        IsEnabled = true,
                    },
                    new()
                    {
                        MetricKey = KpiMetricKey.ContributionPoints,
                        DisplayName = "Điểm đóng góp",
                        Description = "Điểm đóng góp thủ công được ghi nhận cho thành viên.",
                        Weight = 15,
                        IsEnabled = true,
                    },
                    new()
                    {
                        MetricKey = KpiMetricKey.Workload,
                        DisplayName = "Khối lượng công việc",
                        Description = "Số task được giao, chuẩn hóa theo thành viên có workload cao nhất trong CLB.",
                        Weight = 10,
                        IsEnabled = true,
                    },
                ];

                static List<KpiGradeConfig> DefaultKpiGrades() =>
                [
                    new() { Label = "Xuất sắc", MinScore = 90, Color = "#16a34a", DisplayOrder = 0 },
                    new() { Label = "Tốt", MinScore = 75, Color = "#4f46e5", DisplayOrder = 1 },
                    new() { Label = "Đạt", MinScore = 60, Color = "#d97706", DisplayOrder = 2 },
                    new() { Label = "Cần cải thiện", MinScore = 0, Color = "#dc2626", DisplayOrder = 3 },
                ];

                async Task EnsureKpiConfigAsync(Club club)
                {
                    var config = await db.KpiConfigs
                        .Include(c => c.Criteria)
                        .Include(c => c.Grades)
                        .FirstOrDefaultAsync(c => c.ClubId == club.Id);

                    if (config == null)
                    {
                        db.KpiConfigs.Add(new KpiConfig
                        {
                            ClubId = club.Id,
                            UpdatedAt = DateTimeOffset.UtcNow,
                            UpdatedBy = "seeder",
                            Criteria = DefaultKpiCriteria(),
                            Grades = DefaultKpiGrades(),
                        });
                        await db.SaveChangesAsync();
                        return;
                    }

                    var existingKeys = config.Criteria.Select(c => c.MetricKey).ToHashSet();
                    foreach (var criterion in DefaultKpiCriteria().Where(c => !existingKeys.Contains(c.MetricKey)))
                        config.Criteria.Add(criterion);

                    if (config.Grades.Count == 0)
                    {
                        foreach (var grade in DefaultKpiGrades())
                            config.Grades.Add(grade);
                    }

                    await db.SaveChangesAsync();
                }

                await EnsureKpiConfigAsync(clubTech);
                await EnsureKpiConfigAsync(clubEnglish);
                await EnsureKpiConfigAsync(clubMusic);

                var now = DateTimeOffset.UtcNow;
                var marker = $"[KPI-SEED-{now:yyyy-MM}]";
                if (!await db.Tasks.IgnoreQueryFilters().AnyAsync(t => t.Title.Contains(marker)))
                {
                    int? GetDeptId(string clubCode, string deptName)
                        => deptMap.TryGetValue($"{clubCode}_{deptName}", out var dept) ? dept.Id : null;

                    var monthStart = new DateTimeOffset(
                        now.Year,
                        now.Month,
                        1,
                        9,
                        0,
                        0,
                        TimeSpan.Zero);

                    var techLeadId = createdUsers["linh.clb@uef.edu.vn"].Id;
                    var techMemberId = createdUsers["an.clb@uef.edu.vn"].Id;
                    var techProbationId = createdUsers["duc.clb@uef.edu.vn"].Id;
                    var englishAdminId = createdUsers["thu.clb@uef.edu.vn"].Id;
                    var englishLeadId = createdUsers["linh.clb@uef.edu.vn"].Id;
                    var englishProbationId = createdUsers["an.clb@uef.edu.vn"].Id;
                    var musicMemberId = createdUsers["thu.clb@uef.edu.vn"].Id;

                    var techDeptId = GetDeptId("TECH", "Ban Kỹ thuật");
                    var techMediaDeptId = GetDeptId("TECH", "Ban Truyền thông");
                    var englishDeptId = GetDeptId("ENGLISH", "Ban Đào tạo");

                    ClubTask DemoTask(
                        Club club,
                        int? departmentId,
                        string title,
                        string userId,
                        ClubTaskStatus status,
                        int progress,
                        int createdDay,
                        int deadlineDay,
                        int? completedDay,
                        TaskPriority priority = TaskPriority.Medium) =>
                        new()
                        {
                            ClubId = club.Id,
                            DepartmentId = departmentId,
                            Title = $"{marker} {title}",
                            Description = "Dữ liệu demo để kiểm tra luồng KPI nội bộ.",
                            AssignedTo = userId,
                            Status = status,
                            Progress = progress,
                            Priority = priority,
                            CreatedAt = monthStart.AddDays(createdDay).DateTime,
                            CreatedBy = "seeder",
                            UpdatedAt = monthStart.AddDays(createdDay).DateTime,
                            UpdatedBy = "seeder",
                            StartDate = monthStart.AddDays(createdDay),
                            Deadline = monthStart.AddDays(deadlineDay).AddHours(17),
                            CompletedAt = completedDay.HasValue
                                ? monthStart.AddDays(completedDay.Value).AddHours(16)
                                : null,
                        };

                    var tasks = new List<ClubTask>
                    {
                        // TECH: đủ phổ điểm để test xếp hạng/xếp loại
                        DemoTask(clubTech, techDeptId, "Hoàn thiện module đăng ký workshop", techLeadId, ClubTaskStatus.Done, 100, 0, 6, 1, TaskPriority.High),
                        DemoTask(clubTech, techDeptId, "Chuẩn bị checklist triển khai demo", techLeadId, ClubTaskStatus.Done, 100, 0, 8, 1),
                        DemoTask(clubTech, techDeptId, "Rà soát lỗi giao diện dashboard", techLeadId, ClubTaskStatus.Doing, 70, 1, 18, null),
                        DemoTask(clubTech, techMediaDeptId, "Viết nội dung truyền thông tuyển thành viên", techMemberId, ClubTaskStatus.Done, 100, 0, 7, 2),
                        DemoTask(clubTech, techMediaDeptId, "Thiết kế poster sự kiện công nghệ", techMemberId, ClubTaskStatus.Doing, 55, 1, 20, null),
                        DemoTask(clubTech, null, "Phụ trách hậu cần buổi onboarding", techProbationId, ClubTaskStatus.Done, 100, 1, 12, 2),
                        DemoTask(clubTech, null, "Tổng hợp phản hồi thành viên mới", techProbationId, ClubTaskStatus.Todo, 20, 2, 22, null, TaskPriority.Low),

                        // ENGLISH: thu.clb là Club Admin, dùng để test config/results của CLB này
                        DemoTask(clubEnglish, null, "Lên kế hoạch English Speaking Day", englishAdminId, ClubTaskStatus.Done, 100, 0, 5, 1, TaskPriority.High),
                        DemoTask(clubEnglish, null, "Duyệt nội dung bài đăng tuyển thành viên", englishAdminId, ClubTaskStatus.Done, 100, 1, 9, 2),
                        DemoTask(clubEnglish, englishDeptId, "Chuẩn bị giáo án mini game từ vựng", englishLeadId, ClubTaskStatus.Doing, 80, 1, 17, null),
                        DemoTask(clubEnglish, null, "Hỗ trợ check-in buổi sinh hoạt", englishProbationId, ClubTaskStatus.Done, 100, 1, 11, 2),
                        DemoTask(clubEnglish, null, "Tổng hợp ảnh hoạt động", englishProbationId, ClubTaskStatus.Doing, 45, 2, 23, null),

                        // MUSIC: thu.clb chỉ là member, dùng để test my-kpi nhưng không có quyền quản lý
                        DemoTask(clubMusic, null, "Hỗ trợ chuẩn bị tiết mục acoustic", musicMemberId, ClubTaskStatus.Done, 100, 0, 10, 2),
                        DemoTask(clubMusic, null, "Ghi nhận danh sách nhạc cụ cần mượn", musicMemberId, ClubTaskStatus.Doing, 60, 2, 21, null),
                    };

                    db.Tasks.AddRange(tasks);
                    await db.SaveChangesAsync();

                    var englishPlanningTask = tasks.First(t => t.Title.Contains("English Speaking Day"));
                    var techPosterTask = tasks.First(t => t.Title.Contains("Thiết kế poster"));
                    db.TaskAssignees.AddRange(
                        new TaskAssignee
                        {
                            TaskId = englishPlanningTask.Id,
                            UserId = englishLeadId,
                            AssignedAt = DateTime.UtcNow,
                            AssignedBy = "seeder",
                        },
                        new TaskAssignee
                        {
                            TaskId = techPosterTask.Id,
                            UserId = techLeadId,
                            AssignedAt = DateTime.UtcNow,
                            AssignedBy = "seeder",
                        });

                    db.Contributions.AddRange(
                        new Contribution
                        {
                            ClubId = clubTech.Id,
                            UserId = techLeadId,
                            TaskId = tasks.First(t => t.Title.Contains("checklist")).Id,
                            ActivityType = ActivityType.Task,
                            Points = 35,
                            Note = $"{marker} Chủ động hỗ trợ review kỹ thuật.",
                            RecordedAt = monthStart.AddDays(1),
                        },
                        new Contribution
                        {
                            ClubId = clubTech.Id,
                            UserId = techMemberId,
                            TaskId = techPosterTask.Id,
                            ActivityType = ActivityType.Task,
                            Points = 18,
                            Note = $"{marker} Thiết kế bổ sung ngoài kế hoạch.",
                            RecordedAt = monthStart.AddDays(2),
                        },
                        new Contribution
                        {
                            ClubId = clubEnglish.Id,
                            UserId = englishAdminId,
                            TaskId = englishPlanningTask.Id,
                            ActivityType = ActivityType.Task,
                            Points = 40,
                            Note = $"{marker} Điều phối kế hoạch sự kiện.",
                            RecordedAt = monthStart.AddDays(1),
                        },
                        new Contribution
                        {
                            ClubId = clubEnglish.Id,
                            UserId = englishProbationId,
                            ActivityType = ActivityType.Task,
                            Points = 12,
                            Note = $"{marker} Hỗ trợ hậu cần sinh hoạt.",
                            RecordedAt = monthStart.AddDays(2),
                        },
                        new Contribution
                        {
                            ClubId = clubMusic.Id,
                            UserId = musicMemberId,
                            ActivityType = ActivityType.Task,
                            Points = 25,
                            Note = $"{marker} Hỗ trợ chuẩn bị biểu diễn.",
                            RecordedAt = monthStart.AddDays(2),
                        });

                    await db.SaveChangesAsync();
                }
            }

            Console.WriteLine("[Seeder] Done.");
        }
    }
}
