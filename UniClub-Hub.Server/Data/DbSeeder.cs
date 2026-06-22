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
            // Upsert each pair individually so new pairs are added without wiping existing admin config.
            {
                var existingSet = (await db.NotificationPreferences
                    .Where(p => p.ClubId == null)
                    .Select(p => new { p.TriggerKey, p.RecipientRole })
                    .ToListAsync())
                    .Select(p => $"{p.TriggerKey}:{p.RecipientRole}")
                    .ToHashSet();

                static NotificationPreference Pref(string trigger, string role,
                    bool inApp, bool email, string? emailSubj = null) =>
                    new()
                    {
                        ClubId = null, TriggerKey = trigger, RecipientRole = role,
                        InAppEnabled = inApp, EmailEnabled = email, EmailSubject = emailSubj,
                    };

                var defaults = new[]
                {
                    // ── Tuyển thành viên ─────────────────────────────────────
                    Pref(NotificationTriggers.ApplicationSubmitted, NotificationRecipientRoles.ClubAdmin,  true,  false),
                    Pref(NotificationTriggers.ApplicationSubmitted, NotificationRecipientRoles.DeptLead,   false, false),
                    Pref(NotificationTriggers.ApplicationInterview, NotificationRecipientRoles.TargetUser, true,  true,  "Mời phỏng vấn – {{clubName}}"),
                    Pref(NotificationTriggers.ApplicationInterview, NotificationRecipientRoles.ClubAdmin,  false, false),
                    Pref(NotificationTriggers.ApplicationAccepted,  NotificationRecipientRoles.TargetUser, true,  true,  "Đơn được chấp nhận – {{clubName}}"),
                    Pref(NotificationTriggers.ApplicationAccepted,  NotificationRecipientRoles.ClubAdmin,  false, false),
                    Pref(NotificationTriggers.ApplicationRejected,  NotificationRecipientRoles.TargetUser, true,  true,  "Kết quả đơn đăng ký – {{clubName}}"),
                    Pref(NotificationTriggers.ApplicationRejected,  NotificationRecipientRoles.ClubAdmin,  false, false),
                    // ── Quản lý thành viên ───────────────────────────────────
                    Pref(NotificationTriggers.MemberAdded,       NotificationRecipientRoles.TargetUser, true,  false),
                    Pref(NotificationTriggers.MemberAdded,       NotificationRecipientRoles.ClubAdmin,  false, false),
                    Pref(NotificationTriggers.MemberRoleChanged, NotificationRecipientRoles.TargetUser, true,  false),
                    Pref(NotificationTriggers.MemberRoleChanged, NotificationRecipientRoles.ClubAdmin,  false, false),
                    Pref(NotificationTriggers.MemberRemoved,     NotificationRecipientRoles.TargetUser, true,  false),
                    Pref(NotificationTriggers.MemberRemoved,     NotificationRecipientRoles.ClubAdmin,  false, false),
                    // ── Từ chức ──────────────────────────────────────────────
                    Pref(NotificationTriggers.ResignationSubmitted, NotificationRecipientRoles.ClubAdmin,  true,  false),
                    Pref(NotificationTriggers.ResignationSubmitted, NotificationRecipientRoles.DeptLead,   false, false),
                    Pref(NotificationTriggers.ResignationReviewed,  NotificationRecipientRoles.TargetUser, true,  false),
                    Pref(NotificationTriggers.ResignationReviewed,  NotificationRecipientRoles.ClubAdmin,  false, false),
                    // ── Công việc ────────────────────────────────────────────
                    Pref(NotificationTriggers.TaskAssigned,      NotificationRecipientRoles.TargetUser, true,  false),
                    Pref(NotificationTriggers.TaskAssigned,      NotificationRecipientRoles.DeptLead,   false, false),
                    Pref(NotificationTriggers.TaskDeadlineSoon,  NotificationRecipientRoles.TargetUser, true,  false),
                    Pref(NotificationTriggers.TaskDeadlineSoon,  NotificationRecipientRoles.DeptLead,   false, false),
                    Pref(NotificationTriggers.TaskStatusChanged, NotificationRecipientRoles.TargetUser, true,  false),
                    Pref(NotificationTriggers.TaskStatusChanged, NotificationRecipientRoles.DeptLead,   false, false),
                    // ── Sự kiện ──────────────────────────────────────────────
                    Pref(NotificationTriggers.EventCreated,  NotificationRecipientRoles.AllMembers, true,  false),
                    Pref(NotificationTriggers.EventCreated,  NotificationRecipientRoles.ClubAdmin,  false, false),
                    Pref(NotificationTriggers.EventReminder, NotificationRecipientRoles.AllMembers, true,  false),
                    // ── Hệ thống ─────────────────────────────────────────────
                    Pref(NotificationTriggers.SystemAnnouncement, NotificationRecipientRoles.AllMembers, true,  false),
                    Pref(NotificationTriggers.SystemAnnouncement, NotificationRecipientRoles.SuperAdmin, false, false),
                };

                var toAdd = defaults.Where(p => !existingSet.Contains($"{p.TriggerKey}:{p.RecipientRole}")).ToList();
                if (toAdd.Count > 0)
                {
                    db.NotificationPreferences.AddRange(toAdd);
                    await db.SaveChangesAsync();
                }
            }

            // ── Landing Pages ─────────────────────────────────────────────
            if (!await db.LandingPages.AnyAsync())
            {
                static string Layout(string primary, string accent, params (string id, string style, bool visible)[] sections)
                {
                    var secs = sections.Select((s, i) =>
                        $"{{\"id\":\"{s.id}\",\"visible\":{s.visible.ToString().ToLower()},\"order\":{i},\"style\":\"{s.style}\"}}");
                    return $"{{\"theme\":{{\"primaryColor\":\"{primary}\",\"accentColor\":\"{accent}\"}},\"sections\":[{string.Join(",", secs)}]}}";
                }

                db.LandingPages.AddRange(
                    new LandingPage
                    {
                        ClubId = clubTech.Id,
                        HeroImage = "https://picsum.photos/seed/tech-hero/1200/600",
                        Introduction = "CLB Công nghệ UEF là sân chơi lập trình và sáng tạo công nghệ dành cho sinh viên UEF. Chúng tôi tổ chức hackathon, workshop AI, và các dự án thực chiến.",
                        Mission = "Trở thành cộng đồng công nghệ hàng đầu trong môi trường đại học — nơi sinh viên được học hỏi, thực hành và kết nối với ngành.",
                        Vision = "Đến năm 2027, đào tạo 500+ lập trình viên trẻ có kỹ năng thực chiến, sẵn sàng gia nhập thị trường lao động công nghệ.",
                        SocialLinks = "{\"facebook\":\"https://facebook.com/clb-cong-nghe-uef\",\"github\":\"https://github.com/uef-tech-club\",\"zalo\":\"https://zalo.me/uef-tech\"}",
                        LayoutSettings = Layout("#4f46e5", "#7c3aed",
                            ("hero", "minimal", true),
                            ("about", "split", true),
                            ("stats", "banner", true),
                            ("departments", "grid", true),
                            ("events", "default", true),
                            ("posts", "default", true),
                            ("gallery", "default", true),
                            ("apply", "default", true),
                            ("contact", "default", true)),
                    },
                    new LandingPage
                    {
                        ClubId = clubFootball.Id,
                        HeroImage = "https://picsum.photos/seed/football-hero/1200/600",
                        Introduction = "CLB Bóng đá UEF — nơi đam mê thể thao gặp gỡ tinh thần đồng đội. Chúng tôi thi đấu tại các giải sinh viên toàn quốc và rèn luyện thể lực mỗi tuần.",
                        Mission = "Xây dựng thế hệ cầu thủ sinh viên có sức khỏe, kỷ luật và tinh thần fair-play, đại diện UEF tại các giải đấu khu vực.",
                        Vision = "Top 3 CLB bóng đá sinh viên khu vực TP.HCM vào năm 2026.",
                        SocialLinks = "{\"facebook\":\"https://facebook.com/clb-bongda-uef\",\"youtube\":\"https://youtube.com/@uef-football\",\"zalo\":\"https://zalo.me/uef-football\"}",
                        LayoutSettings = Layout("#16a34a", "#15803d",
                            ("hero", "vibrant", true),
                            ("stats", "banner", true),
                            ("about", "default", true),
                            ("events", "timeline", true),
                            ("departments", "list", true),
                            ("gallery", "masonry", true),
                            ("posts", "default", true),
                            ("apply", "banner", true),
                            ("contact", "default", true)),
                    },
                    new LandingPage
                    {
                        ClubId = clubMusic.Id,
                        HeroImage = "https://picsum.photos/seed/music-hero/1200/600",
                        Introduction = "CLB Âm nhạc UEF là mái nhà của những tâm hồn yêu nghệ thuật. Từ nhạc cụ đến thanh nhạc, chúng tôi cùng nhau tạo ra những giai điệu đặc sắc.",
                        Mission = "Nuôi dưỡng tài năng âm nhạc trong cộng đồng sinh viên UEF, mang lại những buổi biểu diễn xúc động và chuyên nghiệp.",
                        Vision = "Tổ chức concert quy mô 1000+ khán giả hàng năm và xuất hiện tại các sân khấu nghệ thuật lớn của thành phố.",
                        SocialLinks = "{\"facebook\":\"https://facebook.com/clb-amnhac-uef\",\"youtube\":\"https://youtube.com/@uef-music\",\"instagram\":\"https://instagram.com/uef.music.club\",\"zalo\":\"https://zalo.me/uef-music\"}",
                        LayoutSettings = Layout("#db2777", "#9333ea",
                            ("hero", "default", true),
                            ("about", "fullwidth", true),
                            ("stats", "default", true),
                            ("events", "timeline", true),
                            ("posts", "magazine", true),
                            ("gallery", "masonry", true),
                            ("departments", "grid", true),
                            ("apply", "banner", true),
                            ("contact", "default", true)),
                    },
                    new LandingPage
                    {
                        ClubId = clubEnglish.Id,
                        HeroImage = "https://picsum.photos/seed/english-hero/1200/600",
                        Introduction = "CLB Tiếng Anh UEF — môi trường lý tưởng để luyện giao tiếp, chinh phục IELTS và tự tin thuyết trình trước đám đông bằng tiếng Anh.",
                        Mission = "Giúp sinh viên UEF tự tin sử dụng tiếng Anh trong học thuật và nghề nghiệp thông qua các hoạt động thực hành sinh động.",
                        Vision = "500 thành viên đạt IELTS 6.0+ vào năm 2027, trở thành CLB tiếng Anh uy tín nhất khu vực.",
                        SocialLinks = "{\"facebook\":\"https://facebook.com/clb-tienganh-uef\",\"zalo\":\"https://zalo.me/uef-english\",\"instagram\":\"https://instagram.com/uef.english.club\"}",
                        LayoutSettings = Layout("#0284c7", "#0891b2",
                            ("hero", "minimal", true),
                            ("about", "default", true),
                            ("stats", "default", true),
                            ("events", "default", true),
                            ("departments", "grid", true),
                            ("posts", "list", true),
                            ("gallery", "default", true),
                            ("apply", "default", true),
                            ("contact", "default", true)),
                    },
                    new LandingPage
                    {
                        ClubId = clubVolunteer.Id,
                        HeroImage = "https://picsum.photos/seed/volunteer-hero/1200/600",
                        Introduction = "CLB Tình nguyện UEF kết nối sinh viên với cộng đồng qua các chương trình từ thiện, bảo vệ môi trường và hỗ trợ vùng khó khăn.",
                        Mission = "Truyền cảm hứng sống có ích, nuôi dưỡng tinh thần tình nguyện và trách nhiệm xã hội cho thế hệ sinh viên UEF.",
                        Vision = "Triển khai 50+ dự án tình nguyện bền vững, chạm đến 10.000 người thụ hưởng tại các tỉnh thành trên cả nước.",
                        SocialLinks = "{\"facebook\":\"https://facebook.com/clb-tinhnguyen-uef\",\"zalo\":\"https://zalo.me/uef-volunteer\",\"tiktok\":\"https://tiktok.com/@uef.volunteer\"}",
                        LayoutSettings = Layout("#059669", "#0d9488",
                            ("hero", "vibrant", true),
                            ("about", "fullwidth", true),
                            ("stats", "banner", true),
                            ("events", "timeline", true),
                            ("posts", "default", true),
                            ("gallery", "masonry", true),
                            ("departments", "list", true),
                            ("apply", "banner", true),
                            ("contact", "default", true)),
                    }
                );
                await db.SaveChangesAsync();
            }

            // ── Events ────────────────────────────────────────────────────
            if (!await db.Events.AnyAsync())
            {
                var now2 = DateTimeOffset.UtcNow;
                db.Events.AddRange(
                    // CLB Công nghệ
                    new ClubEvent
                    {
                        ClubId = clubTech.Id,
                        Name = "Hackathon UEF Tech 2025",
                        Description = "Cuộc thi lập trình 24 giờ với chủ đề AI & Automation. Giải thưởng lên đến 20 triệu đồng.",
                        Location = "Hội trường A, UEF Cơ sở 1",
                        StartTime = now2.AddDays(14),
                        EndTime = now2.AddDays(15),
                        MaxParticipants = 200,
                        Status = EventStatus.InProgress,
                        Category = "Competition",
                        CreatedAt = DateTime.UtcNow,
                    },
                    new ClubEvent
                    {
                        ClubId = clubTech.Id,
                        Name = "Workshop: Làm quen với Machine Learning",
                        Description = "Workshop thực hành từ cơ bản đến xây dựng model đơn giản với Python và scikit-learn.",
                        Location = "Phòng máy tính B201",
                        StartTime = now2.AddDays(7),
                        EndTime = now2.AddDays(7).AddHours(3),
                        MaxParticipants = 50,
                        Status = EventStatus.InProgress,
                        Category = "Workshop",
                        CreatedAt = DateTime.UtcNow,
                    },
                    new ClubEvent
                    {
                        ClubId = clubTech.Id,
                        Name = "Tech Talk: Roadmap Lập trình Web 2025",
                        Description = "Buổi chia sẻ kinh nghiệm thực tế từ các kỹ sư phần mềm tại các công ty công nghệ.",
                        Location = "Phòng hội thảo C301",
                        StartTime = now2.AddDays(21),
                        EndTime = now2.AddDays(21).AddHours(2),
                        MaxParticipants = 100,
                        Status = EventStatus.Draft,
                        Category = "Talk",
                        CreatedAt = DateTime.UtcNow,
                    },
                    // CLB Bóng đá
                    new ClubEvent
                    {
                        ClubId = clubFootball.Id,
                        Name = "Giải Bóng đá Sinh viên UEF Cup 2025",
                        Description = "Giải đấu thường niên giữa các khoa và CLB trong trường. Đăng ký theo đội, tối đa 16 đội.",
                        Location = "Sân vận động UEF",
                        StartTime = now2.AddDays(10),
                        EndTime = now2.AddDays(12),
                        MaxParticipants = 256,
                        Status = EventStatus.InProgress,
                        Category = "Competition",
                        CreatedAt = DateTime.UtcNow,
                    },
                    new ClubEvent
                    {
                        ClubId = clubFootball.Id,
                        Name = "Buổi tập thể lực & kỹ thuật mùa hè",
                        Description = "Chương trình tập luyện đặc biệt mùa hè — cải thiện thể lực nền và kỹ năng cá nhân.",
                        Location = "Sân vận động UEF",
                        StartTime = now2.AddDays(3),
                        EndTime = now2.AddDays(3).AddHours(2),
                        MaxParticipants = 60,
                        Status = EventStatus.InProgress,
                        Category = "Training",
                        CreatedAt = DateTime.UtcNow,
                    },
                    // CLB Âm nhạc
                    new ClubEvent
                    {
                        ClubId = clubMusic.Id,
                        Name = "UEF Music Night — Đêm Nhạc Cuối Năm",
                        Description = "Đêm biểu diễn nghệ thuật đặc sắc với hơn 20 tiết mục từ các ban nhạc và giọng ca xuất sắc của UEF.",
                        Location = "Sân khấu lớn UEF",
                        StartTime = now2.AddDays(30),
                        EndTime = now2.AddDays(30).AddHours(4),
                        MaxParticipants = 500,
                        Status = EventStatus.Draft,
                        Category = "Concert",
                        CreatedAt = DateTime.UtcNow,
                    },
                    new ClubEvent
                    {
                        ClubId = clubMusic.Id,
                        Name = "Tuyển thành viên & Audition mùa mới",
                        Description = "CLB Âm nhạc mở cửa tuyển thành viên mới. Không cần kinh nghiệm — chỉ cần đam mê!",
                        Location = "Phòng sinh hoạt CLB D102",
                        StartTime = now2.AddDays(5),
                        EndTime = now2.AddDays(5).AddHours(3),
                        MaxParticipants = 30,
                        Status = EventStatus.InProgress,
                        Category = "Recruitment",
                        CreatedAt = DateTime.UtcNow,
                    },
                    // CLB Tiếng Anh
                    new ClubEvent
                    {
                        ClubId = clubEnglish.Id,
                        Name = "English Speaking Contest 2025",
                        Description = "Cuộc thi hùng biện tiếng Anh cấp trường với chủ đề \"Technology & Future Society\".",
                        Location = "Hội trường A",
                        StartTime = now2.AddDays(18),
                        EndTime = now2.AddDays(18).AddHours(5),
                        MaxParticipants = 150,
                        Status = EventStatus.InProgress,
                        Category = "Competition",
                        CreatedAt = DateTime.UtcNow,
                    },
                    new ClubEvent
                    {
                        ClubId = clubEnglish.Id,
                        Name = "IELTS Strategy Workshop",
                        Description = "Chiến lược ôn thi IELTS hiệu quả từ 0 lên 6.5 trong 6 tháng — chia sẻ bởi cựu thành viên CLB đạt 7.5.",
                        Location = "Phòng hội thảo C201",
                        StartTime = now2.AddDays(8),
                        EndTime = now2.AddDays(8).AddHours(2.5),
                        MaxParticipants = 80,
                        Status = EventStatus.InProgress,
                        Category = "Workshop",
                        CreatedAt = DateTime.UtcNow,
                    },
                    // CLB Tình nguyện
                    new ClubEvent
                    {
                        ClubId = clubVolunteer.Id,
                        Name = "Chiến dịch Mùa Hè Xanh 2025",
                        Description = "Hành trình tình nguyện 5 ngày tại tỉnh Đắk Lắk — xây trường, tặng quà và dạy học cho trẻ em vùng khó.",
                        Location = "Đắk Lắk",
                        StartTime = now2.AddDays(25),
                        EndTime = now2.AddDays(30),
                        MaxParticipants = 40,
                        Status = EventStatus.InProgress,
                        Category = "Volunteer",
                        CreatedAt = DateTime.UtcNow,
                    },
                    new ClubEvent
                    {
                        ClubId = clubVolunteer.Id,
                        Name = "Ngày hội Hiến máu nhân đạo",
                        Description = "Phối hợp với Hội Chữ thập đỏ tổ chức ngày hội hiến máu tại UEF — mỗi giọt máu là một hành động ý nghĩa.",
                        Location = "Sảnh tầng 1, UEF Cơ sở 1",
                        StartTime = now2.AddDays(6),
                        EndTime = now2.AddDays(6).AddHours(6),
                        MaxParticipants = 300,
                        Status = EventStatus.InProgress,
                        Category = "Community",
                        CreatedAt = DateTime.UtcNow,
                    }
                );
                await db.SaveChangesAsync();
            }

            // ── Posts ─────────────────────────────────────────────────────
            if (!await db.Posts.AnyAsync())
            {
                var authorTech    = createdUsers["truong.clb@uef.edu.vn"].Id;
                var authorFootball = createdUsers["minh.clb@uef.edu.vn"].Id;
                var authorMusic   = createdUsers["hoa.clb@uef.edu.vn"].Id;
                var authorEnglish = createdUsers["thu.clb@uef.edu.vn"].Id;
                var authorVol     = createdUsers["mai.clb@uef.edu.vn"].Id;

                db.Posts.AddRange(
                    // TECH — 3 bài
                    new Post
                    {
                        ClubId = clubTech.Id, AuthorId = authorTech,
                        Title = "CLB Công nghệ UEF đạt giải nhất Hackathon Quốc gia 2024",
                        Content = "<p>Đội tuyển của CLB Công nghệ UEF xuất sắc đạt giải nhất tại cuộc thi Hackathon Quốc gia 2024 với giải pháp AI hỗ trợ nông nghiệp thông minh...</p>",
                        ThumbnailUrl = "https://picsum.photos/seed/tech-p1/800/450",
                        Category = PostCategory.News, IsPublished = true,
                        CreatedAt = DateTime.UtcNow.AddDays(-5),
                    },
                    new Post
                    {
                        ClubId = clubTech.Id, AuthorId = authorTech,
                        Title = "Tổng kết Workshop Python AI — 120 sinh viên tham gia",
                        Content = "<p>Workshop lập trình AI với Python thu hút hơn 120 sinh viên từ các khoa. Các bạn được thực hành trực tiếp với dataset thực tế...</p>",
                        ThumbnailUrl = "https://picsum.photos/seed/tech-p2/800/450",
                        Category = PostCategory.News, IsPublished = true,
                        CreatedAt = DateTime.UtcNow.AddDays(-12),
                    },
                    new Post
                    {
                        ClubId = clubTech.Id, AuthorId = authorTech,
                        Title = "Thông báo: Mở đăng ký Hackathon UEF Tech 2025",
                        Content = "<p>Hackathon UEF Tech 2025 chính thức mở đăng ký. Chủ đề năm nay: <strong>AI & Automation</strong>. Đăng ký theo nhóm 2-4 người...</p>",
                        ThumbnailUrl = "https://picsum.photos/seed/tech-p3/800/450",
                        Category = PostCategory.Announcement, IsPublished = true,
                        CreatedAt = DateTime.UtcNow.AddDays(-2),
                    },
                    // FOOTBALL — 2 bài
                    new Post
                    {
                        ClubId = clubFootball.Id, AuthorId = authorFootball,
                        Title = "UEF FC vô địch Giải Bóng đá Sinh viên TP.HCM lần III",
                        Content = "<p>Sau 90 phút kịch tính, UEF FC giành chức vô địch với tỷ số 2-1 trước đội chủ nhà UIT trong trận chung kết gay cấn...</p>",
                        ThumbnailUrl = "https://picsum.photos/seed/football-p1/800/450",
                        Category = PostCategory.News, IsPublished = true,
                        CreatedAt = DateTime.UtcNow.AddDays(-8),
                    },
                    new Post
                    {
                        ClubId = clubFootball.Id, AuthorId = authorFootball,
                        Title = "Lịch tập mùa hè 2025 — Tăng cường thể lực",
                        Content = "<p>Ban huấn luyện thông báo lịch tập mùa hè với chương trình tăng cường thể lực đặc biệt. Tập luyện mỗi sáng thứ 3, 5, 7 tại sân UEF...</p>",
                        ThumbnailUrl = "https://picsum.photos/seed/football-p2/800/450",
                        Category = PostCategory.Announcement, IsPublished = true,
                        CreatedAt = DateTime.UtcNow.AddDays(-3),
                    },
                    // MUSIC — 3 bài
                    new Post
                    {
                        ClubId = clubMusic.Id, AuthorId = authorMusic,
                        Title = "UEF Music Night 2024 — Đêm nhạc cháy hết mình",
                        Content = "<p>Hơn 400 khán giả đã có mặt tại đêm nhạc UEF Music Night 2024. 22 tiết mục từ rock đến ballad, từ solo đến band...</p>",
                        ThumbnailUrl = "https://picsum.photos/seed/music-p1/800/450",
                        Category = PostCategory.News, IsPublished = true,
                        CreatedAt = DateTime.UtcNow.AddDays(-15),
                    },
                    new Post
                    {
                        ClubId = clubMusic.Id, AuthorId = authorMusic,
                        Title = "Tuyển thành viên Ban Nhạc cụ & Thanh nhạc học kỳ II/2025",
                        Content = "<p>CLB Âm nhạc UEF tuyển thêm thành viên cho 2 ban: Nhạc cụ (guitar, piano, violin) và Thanh nhạc. Không yêu cầu kinh nghiệm...</p>",
                        ThumbnailUrl = "https://picsum.photos/seed/music-p2/800/450",
                        Category = PostCategory.Announcement, IsPublished = true,
                        CreatedAt = DateTime.UtcNow.AddDays(-4),
                    },
                    new Post
                    {
                        ClubId = clubMusic.Id, AuthorId = authorMusic,
                        Title = "Recap: Buổi jam session acoustic đầu xuân 2025",
                        Content = "<p>Buổi jam session acoustic với sự tham gia của 15 nghệ sĩ sinh viên. Không gian ấm cúng, giai điệu chân thật — một buổi chiều không thể quên...</p>",
                        ThumbnailUrl = "https://picsum.photos/seed/music-p3/800/450",
                        Category = PostCategory.News, IsPublished = true,
                        CreatedAt = DateTime.UtcNow.AddDays(-20),
                    },
                    // ENGLISH — 2 bài
                    new Post
                    {
                        ClubId = clubEnglish.Id, AuthorId = authorEnglish,
                        Title = "10 bí quyết nâng band IELTS từ 5.5 lên 6.5 trong 3 tháng",
                        Content = "<p>Dựa trên kinh nghiệm của các thành viên CLB đã chinh phục IELTS 6.5+, chúng tôi tổng hợp 10 bí quyết học hiệu quả nhất...</p>",
                        ThumbnailUrl = "https://picsum.photos/seed/english-p1/800/450",
                        Category = PostCategory.News, IsPublished = true,
                        CreatedAt = DateTime.UtcNow.AddDays(-10),
                    },
                    new Post
                    {
                        ClubId = clubEnglish.Id, AuthorId = authorEnglish,
                        Title = "Kết quả English Speaking Contest 2024 — UEF tỏa sáng",
                        Content = "<p>UEF giành 2 giải nhất và 1 giải nhì tại cuộc thi hùng biện tiếng Anh cấp trường. Chúc mừng các bạn đã đại diện xuất sắc cho CLB...</p>",
                        ThumbnailUrl = "https://picsum.photos/seed/english-p2/800/450",
                        Category = PostCategory.News, IsPublished = true,
                        CreatedAt = DateTime.UtcNow.AddDays(-30),
                    },
                    // VOLUNTEER — 3 bài
                    new Post
                    {
                        ClubId = clubVolunteer.Id, AuthorId = authorVol,
                        Title = "Mùa Hè Xanh 2024 — Hành trình 7 ngày ý nghĩa tại Kon Tum",
                        Content = "<p>Hơn 35 tình nguyện viên UEF đã đến với Kon Tum, xây dựng 2 phòng học mới, tặng 500 suất quà và tổ chức lớp học hè cho 120 em nhỏ...</p>",
                        ThumbnailUrl = "https://picsum.photos/seed/volunteer-p1/800/450",
                        Category = PostCategory.News, IsPublished = true,
                        CreatedAt = DateTime.UtcNow.AddDays(-60),
                    },
                    new Post
                    {
                        ClubId = clubVolunteer.Id, AuthorId = authorVol,
                        Title = "Chiến dịch \"Xanh hóa Trường học\" — Trồng 200 cây xanh tại UEF",
                        Content = "<p>Nhân ngày Môi trường Thế giới 5/6, CLB Tình nguyện UEF phối hợp với Ban Quản lý cơ sở vật chất trồng 200 cây xanh trên khuôn viên trường...</p>",
                        ThumbnailUrl = "https://picsum.photos/seed/volunteer-p2/800/450",
                        Category = PostCategory.News, IsPublished = true,
                        CreatedAt = DateTime.UtcNow.AddDays(-25),
                    },
                    new Post
                    {
                        ClubId = clubVolunteer.Id, AuthorId = authorVol,
                        Title = "Đăng ký tham gia Mùa Hè Xanh 2025 — Hạn cuối 15/6",
                        Content = "<p>Chiến dịch Mùa Hè Xanh 2025 chính thức mở đăng ký. Năm nay CLB hướng đến Đắk Lắk — vùng đất giàu văn hóa nhưng còn nhiều khó khăn...</p>",
                        ThumbnailUrl = "https://picsum.photos/seed/volunteer-p3/800/450",
                        Category = PostCategory.Announcement, IsPublished = true,
                        CreatedAt = DateTime.UtcNow.AddDays(-6),
                    }
                );
                await db.SaveChangesAsync();
            }

            // ── Media Gallery ─────────────────────────────────────────────
            if (!await db.MediaGalleries.AnyAsync())
            {
                var galleryItems = new List<MediaGallery>();

                // Helper tạo một loạt ảnh cho 1 club
                void AddPhotos(int clubId, string seed, string[] captions)
                {
                    for (int i = 0; i < captions.Length; i++)
                        galleryItems.Add(new MediaGallery
                        {
                            ClubId = clubId,
                            MediaUrl = $"https://picsum.photos/seed/{seed}-{i + 1}/600/400",
                            MediaType = MediaType.Image,
                            Description = captions[i],
                        });
                }

                AddPhotos(clubTech.Id, "tech-g", [
                    "Hackathon 2024 — Đội 1 trình bày giải pháp",
                    "Workshop Python AI — Học viên thực hành",
                    "Tech Talk: Chia sẻ kinh nghiệm từ kỹ sư senior",
                    "Lễ trao giải Hackathon Quốc gia 2024",
                    "Buổi mentor 1-1 với cố vấn kỹ thuật",
                    "Team building cuối năm CLB Công nghệ",
                ]);

                AddPhotos(clubFootball.Id, "football-g", [
                    "Trận chung kết UEF Cup — Khoảnh khắc ghi bàn",
                    "Lễ nhận cúp vô địch mùa giải 2024",
                    "Buổi tập luyện sáng thứ 5 tại sân UEF",
                    "Ảnh đội hình chính thức năm 2025",
                    "Giao hữu với CLB Bóng đá UIT",
                    "Celebration sau chiến thắng",
                ]);

                AddPhotos(clubMusic.Id, "music-g", [
                    "UEF Music Night 2024 — Tiết mục mở màn",
                    "Ban nhạc acoustic trên sân khấu",
                    "Jam session cuối tuần tại phòng CLB",
                    "Rehearsal cho concert cuối năm",
                    "Trao giải cuộc thi hát nội bộ",
                    "Ảnh kỷ niệm các thành viên ban nhạc",
                    "Biểu diễn tại Ngày hội sinh viên UEF",
                ]);

                AddPhotos(clubEnglish.Id, "english-g", [
                    "English Speaking Contest 2024 — Vòng chung kết",
                    "Workshop IELTS Writing với giáo viên khách mời",
                    "Câu lạc bộ tiếng Anh giao lưu với sinh viên quốc tế",
                    "Trao giải các nhà vô địch ESC 2024",
                    "Buổi storytelling night cuối học kỳ",
                ]);

                AddPhotos(clubVolunteer.Id, "volunteer-g", [
                    "Mùa Hè Xanh 2024 — Khánh thành phòng học mới",
                    "Trao 500 suất quà cho trẻ em Kon Tum",
                    "Lớp học hè tình nguyện buổi sáng",
                    "Trồng cây xanh tại khuôn viên UEF",
                    "Ngày hội hiến máu — Kiểm tra sức khỏe",
                    "Team tình nguyện chụp ảnh kỷ niệm",
                    "Dọn vệ sinh bãi biển Vũng Tàu",
                ]);

                db.MediaGalleries.AddRange(galleryItems);
                await db.SaveChangesAsync();
            }

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
