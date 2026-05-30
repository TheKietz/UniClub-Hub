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
            if (!await db.Categories.AnyAsync())
            {
                db.Categories.AddRange(
                    new Category
                    {
                        Name = "Học thuật & Nghiên cứu",
                        Description = "Các CLB định hướng học thuật, nghiên cứu khoa học.",
                    },
                    new Category
                    {
                        Name = "Thể thao & Sức khỏe",
                        Description = "Các CLB thể dục thể thao và rèn luyện sức khỏe.",
                    },
                    new Category
                    {
                        Name = "Văn nghệ & Nghệ thuật",
                        Description = "Các CLB âm nhạc, múa, kịch nghệ, mỹ thuật.",
                    },
                    new Category
                    {
                        Name = "Kỹ năng & Phát triển bản thân",
                        Description = "Các CLB phát triển kỹ năng mềm, ngoại ngữ, lãnh đạo.",
                    },
                    new Category
                    {
                        Name = "Tình nguyện & Cộng đồng",
                        Description = "Các CLB hoạt động xã hội, thiện nguyện, môi trường.",
                    }
                );
                await db.SaveChangesAsync();
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
            if (!await db.Clubs.AnyAsync())
            {
                db.Clubs.AddRange(
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
                );
                await db.SaveChangesAsync();
            }

            var clubs = await db.Clubs.IgnoreQueryFilters().ToListAsync();
            var clubTech = clubs.First(c => c.Code == "TECH");
            var clubFootball = clubs.First(c => c.Code == "FOOTBALL");
            var clubMusic = clubs.First(c => c.Code == "MUSIC");
            var clubEnglish = clubs.First(c => c.Code == "ENGLISH");
            var clubVolunteer = clubs.First(c => c.Code == "VOLUNTEER");

            // ── Departments ───────────────────────────────────────────────
            if (!await db.Departments.AnyAsync())
            {
                db.Departments.AddRange(
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
                    },
                    // ENGLISH
                    new Department
                    {
                        ClubId = clubEnglish.Id,
                        Name = "Ban Đào tạo",
                        Description = "Tổ chức lớp học, workshop IELTS và kỹ năng giao tiếp.",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    },
                    new Department
                    {
                        ClubId = clubEnglish.Id,
                        Name = "Ban Truyền thông",
                        Description = "Quản lý nội dung song ngữ và mạng xã hội CLB.",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    },
                    // VOLUNTEER
                    new Department
                    {
                        ClubId = clubVolunteer.Id,
                        Name = "Ban Dự án",
                        Description = "Lên kế hoạch và triển khai các chương trình tình nguyện.",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    },
                    new Department
                    {
                        ClubId = clubVolunteer.Id,
                        Name = "Ban Truyền thông",
                        Description = "Lan tỏa giá trị và hình ảnh các hoạt động tình nguyện.",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    }
                );
                await db.SaveChangesAsync();
            }

            var depts = await db.Departments.IgnoreQueryFilters().ToListAsync();

            // ── Memberships ───────────────────────────────────────────────
            if (!await db.ClubMemberships.AnyAsync())
            {
                var today = DateOnly.FromDateTime(DateTime.Today);

                // Helper lấy dept ID
                int DeptId(int clubId, string name) =>
                    depts.First(d => d.ClubId == clubId && d.Name == name).Id;

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
                        DepartmentId = DeptId(clubTech.Id, "Ban Kỹ thuật"),
                    },
                    new()
                    {
                        UserId = createdUsers["an.clb@uef.edu.vn"].Id,
                        ClubId = clubTech.Id,
                        ClubRole = ClubRole.MEMBER,
                        JoinedDate = new DateOnly(2023, 1, 10),
                        Status = MembershipStatus.Active,
                        DepartmentId = DeptId(clubTech.Id, "Ban Truyền thông"),
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
                        DepartmentId = DeptId(clubFootball.Id, "Ban Chuyên môn"),
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
                        DepartmentId = DeptId(clubMusic.Id, "Ban Thanh nhạc"),
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
                        DepartmentId = DeptId(clubEnglish.Id, "Ban Đào tạo"),
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
                        DepartmentId = DeptId(clubVolunteer.Id, "Ban Dự án"),
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

            Console.WriteLine("[Seeder] Done.");
        }
    }
}
