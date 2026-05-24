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
            (string Key, string Cat, string Type, string Label, string Desc, string Val)[] publicSettings =
            [
                ("landing.banner_enabled", "landing", "toggle", "Hiển thị banner thông báo",   "Bật để hiện banner ở đầu trang chủ.",                                  "false"),
                ("landing.banner_text",    "landing", "text",   "Nội dung banner",              "Ví dụ: Đang mở đơn tuyển thành viên học kỳ 2/2026!",                   ""),
                ("landing.banner_color",   "landing", "text",   "Màu nền banner (hex)",         "Ví dụ: #f59e0b (vàng), #4f46e5 (tím), #10b981 (xanh), #ef4444 (đỏ).", "#f59e0b"),
                ("footer.facebook_url",    "footer",  "text",   "Link Facebook",                "URL trang Facebook của trường/phòng CTSV. Để trống = ẩn icon.",         ""),
                ("footer.instagram_url",   "footer",  "text",   "Link Instagram",               "URL trang Instagram. Để trống = ẩn icon.",                             ""),
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

            Console.WriteLine("[Seeder] Done.");
        }
    }
}
