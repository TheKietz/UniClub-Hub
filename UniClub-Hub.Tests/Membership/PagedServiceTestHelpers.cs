using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using UniClub_Hub.Membership.Services.Implements;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Email;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Tests.Membership;

internal static class PagedServiceTestHelpers
{
    public static ApplicationUser User(int index, string? name = null, string? email = null, string? studentId = null) => new()
    {
        Id = $"u{index}",
        UserName = email ?? $"user{index}@uef.edu.vn",
        NormalizedUserName = (email ?? $"user{index}@uef.edu.vn").ToUpperInvariant(),
        Email = email ?? $"user{index}@uef.edu.vn",
        NormalizedEmail = (email ?? $"user{index}@uef.edu.vn").ToUpperInvariant(),
        FullName = name ?? $"User {index:00}",
        StudentId = studentId ?? $"S{index:000}",
        SecurityStamp = $"s{index}",
    };

    public static Club Club(int id, string name, string code, int? categoryId = null, ClubStatus status = ClubStatus.Active) => new()
    {
        Id = id,
        Name = name,
        Code = code,
        CategoryId = categoryId,
        Status = status,
        CreatedAt = new DateTime(2026, 1, id, 0, 0, 0, DateTimeKind.Utc),
    };

    public static Department Department(int id, int clubId, string name) => new()
    {
        Id = id,
        ClubId = clubId,
        Name = name,
        CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
    };

    public static ClubMembership Membership(
        int id,
        string userId,
        int clubId = 1,
        ClubRole role = ClubRole.MEMBER,
        MembershipStatus status = MembershipStatus.Active,
        int? departmentId = null) => new()
    {
        Id = id,
        UserId = userId,
        ClubId = clubId,
        ClubRole = role,
        Status = status,
        DepartmentId = departmentId,
        JoinedDate = new DateOnly(2026, 1, Math.Clamp(id, 1, 28)),
    };

    public static ClubApplication Application(
        int id,
        string userId,
        int clubId = 1,
        ApplicationStatus status = ApplicationStatus.Pending,
        int? stageId = null,
        DateTime? appliedAt = null) => new()
    {
        Id = id,
        UserId = userId,
        ClubId = clubId,
        Status = status,
        CurrentStageId = stageId,
        AppliedAt = appliedAt ?? new DateTime(2026, 2, Math.Clamp(id, 1, 28), 9, 0, 0, DateTimeKind.Utc),
    };

    public static UserService CreateUserService(UniClubDbContext db)
    {
        var store = new Mock<IUserStore<ApplicationUser>>();
        var manager = new Mock<UserManager<ApplicationUser>>(
            store.Object,
            Options.Create(new IdentityOptions()),
            new PasswordHasher<ApplicationUser>(),
            Array.Empty<IUserValidator<ApplicationUser>>(),
            Array.Empty<IPasswordValidator<ApplicationUser>>(),
            new UpperInvariantLookupNormalizer(),
            new IdentityErrorDescriber(),
            Mock.Of<IServiceProvider>(),
            Mock.Of<ILogger<UserManager<ApplicationUser>>>());

        return new UserService(manager.Object, db);
    }

    public static ClubService CreateClubService(UniClubDbContext db) =>
        new(db, Mock.Of<IClubMembershipService>(), Mock.Of<ISystemSettingService>(), Mock.Of<IClubPermissionService>());

    public static ClubMembershipService CreateClubMembershipService(UniClubDbContext db)
    {
        var dispatch = new Mock<INotificationDispatchService>();
        dispatch.Setup(d => d.FireAsync(It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<Dictionary<string, string>>()))
            .Returns(Task.CompletedTask);

        var settings = new Mock<ISystemSettingService>();
        settings.Setup(s => s.GetValueAsync("club.max_members")).ReturnsAsync((string?)null);

        return new ClubMembershipService(db, dispatch.Object, settings.Object, Mock.Of<IClubPermissionService>());
    }

    public static Mock<IClubPermissionService> CreatePermissivePermissionMock()
    {
        var permissions = new Mock<IClubPermissionService>();
        permissions.Setup(p => p.EnsureHasPermissionAsync(
                It.IsAny<int>(), It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<string>()))
            .Returns(Task.CompletedTask);
        return permissions;
    }

    public static ApplicationService CreateApplicationService(UniClubDbContext db) =>
        CreateApplicationService(db, CreatePermissivePermissionMock());

    public static ApplicationService CreateApplicationService(
        UniClubDbContext db,
        Mock<IClubPermissionService> permissions) =>
        CreateApplicationService(db, permissions, CreateClubMembershipService(db));

    public static ApplicationService CreateApplicationService(
        UniClubDbContext db,
        Mock<IClubPermissionService> permissions,
        ClubMembershipService membershipService)
    {
        var dispatch = new Mock<INotificationDispatchService>();
        dispatch.Setup(d => d.FireAsync(It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<Dictionary<string, string>>()))
            .Returns(Task.CompletedTask);

        var config = new ConfigurationBuilder().AddInMemoryCollection().Build();

        return new ApplicationService(
            db,
            Mock.Of<IEmailService>(),
            config,
            Mock.Of<ISystemSettingService>(),
            dispatch.Object,
            permissions.Object,
            membershipService);
    }

    public static ClubService CreateClubServiceWithMembership(UniClubDbContext db)
    {
        var settings = new Mock<ISystemSettingService>();
        settings.Setup(s => s.GetValueAsync(It.IsAny<string>())).ReturnsAsync((string?)null);

        var dispatch = new Mock<INotificationDispatchService>();
        dispatch.Setup(d => d.FireAsync(It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<Dictionary<string, string>>()))
            .Returns(Task.CompletedTask);

        var membership = new ClubMembershipService(
            db, dispatch.Object, settings.Object, Mock.Of<IClubPermissionService>());

        return new ClubService(db, membership, settings.Object, Mock.Of<IClubPermissionService>());
    }

    public static ResignationRequest Resignation(
        int id,
        string userId,
        int membershipId,
        int clubId = 1,
        ClubRole role = ClubRole.DEPT_LEAD,
        ResignationStatus status = ResignationStatus.Pending,
        DateTime? requestedAt = null) => new()
    {
        Id = id,
        UserId = userId,
        ClubId = clubId,
        MembershipId = membershipId,
        Preference = ResignationPreference.BecomeMember,
        Status = status,
        RequestedAt = requestedAt ?? new DateTime(2026, 3, Math.Clamp(id, 1, 28), 9, 0, 0, DateTimeKind.Utc),
    };

    public static ResignationService CreateResignationService(UniClubDbContext db)
    {
        var dispatch = new Mock<INotificationDispatchService>();
        dispatch.Setup(d => d.FireAsync(It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<Dictionary<string, string>>()))
            .Returns(Task.CompletedTask);

        var permissions = new Mock<IClubPermissionService>();
        permissions.Setup(p => p.EnsureHasPermissionAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        return new ResignationService(db, dispatch.Object, permissions.Object);
    }

    public static SupportTicket Ticket(
        int id,
        string userId,
        string subject,
        string status = "Open",
        DateTime? createdAt = null) => new()
    {
        Id = id,
        UserId = userId,
        Subject = subject,
        Message = $"Message {id}",
        Status = status,
        CreatedAt = createdAt ?? new DateTime(2026, 3, Math.Clamp(id, 1, 28), 9, 0, 0, DateTimeKind.Utc),
    };

    public static SupportService CreateSupportService(UniClubDbContext db)
    {
        var store = new Mock<IUserStore<ApplicationUser>>();
        var manager = new Mock<UserManager<ApplicationUser>>(
            store.Object,
            Options.Create(new IdentityOptions()),
            new PasswordHasher<ApplicationUser>(),
            Array.Empty<IUserValidator<ApplicationUser>>(),
            Array.Empty<IPasswordValidator<ApplicationUser>>(),
            new UpperInvariantLookupNormalizer(),
            new IdentityErrorDescriber(),
            Mock.Of<IServiceProvider>(),
            Mock.Of<ILogger<UserManager<ApplicationUser>>>());

        return new SupportService(
            db,
            Mock.Of<INotificationService>(),
            manager.Object,
            Mock.Of<ISystemSettingService>());
    }
}
