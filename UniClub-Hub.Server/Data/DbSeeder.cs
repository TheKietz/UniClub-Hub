using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
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

            Console.WriteLine("[Seeder] Done.");
        }
    }
}
