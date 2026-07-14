using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Common;
using UniClub_Hub.Membership.DTOs.User;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class UserService : IUserService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly UniClubDbContext _db;

        public UserService(UserManager<ApplicationUser> userManager, UniClubDbContext db)
        {
            _userManager = userManager;
            _db = db;
        }

        public async Task<PagedResult<UserListItemDto>> GetUsersAsync(string? search, int page, int pageSize)
            => await GetUsersAsync(new UserListQuery { Search = search, Page = page, PageSize = pageSize });

        public async Task<PagedResult<UserListItemDto>> GetUsersAsync(UserListQuery request)
        {
            var page = Math.Max(1, request.Page);
            var pageSize = Math.Clamp(request.PageSize, 1, 100);
            var now = DateTimeOffset.UtcNow;
            var query = _db.Users.AsQueryable();

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var s = request.Search.Trim().ToLower();
                query = query.Where(u =>
                    (u.FullName != null && u.FullName.ToLower().Contains(s)) ||
                    (u.Email != null && u.Email.ToLower().Contains(s)) ||
                    (u.StudentId != null && u.StudentId.ToLower().Contains(s)));
            }

            if (!string.IsNullOrWhiteSpace(request.Status))
            {
                var status = request.Status.Trim().ToLower();
                if (status == "locked")
                    query = query.Where(u => u.LockoutEnabled && u.LockoutEnd.HasValue && u.LockoutEnd > now);
                else if (status == "active")
                    query = query.Where(u => !(u.LockoutEnabled && u.LockoutEnd.HasValue && u.LockoutEnd > now));
            }

            if (!string.IsNullOrWhiteSpace(request.Role))
            {
                var role = request.Role.Trim().ToUpper();
                query = query.Where(u =>
                    _db.UserRoles.Any(ur => ur.UserId == u.Id &&
                        _db.Roles.Any(r => r.Id == ur.RoleId && r.NormalizedName == role)));
            }

            var sortBy = request.SortBy.Trim().ToLower();
            var desc = request.SortDir.Equals("desc", StringComparison.OrdinalIgnoreCase);
            var orderedQuery = sortBy switch
            {
                "email" => desc ? query.OrderByDescending(u => u.Email) : query.OrderBy(u => u.Email),
                "role" => desc
                    ? query.OrderByDescending(u => _db.UserRoles
                        .Where(ur => ur.UserId == u.Id)
                        .Join(_db.Roles, ur => ur.RoleId, r => r.Id, (_, r) => r.Name)
                        .OrderBy(name => name)
                        .FirstOrDefault())
                    : query.OrderBy(u => _db.UserRoles
                        .Where(ur => ur.UserId == u.Id)
                        .Join(_db.Roles, ur => ur.RoleId, r => r.Id, (_, r) => r.Name)
                        .OrderBy(name => name)
                        .FirstOrDefault()),
                "status" => desc
                    ? query.OrderByDescending(u => u.LockoutEnabled && u.LockoutEnd.HasValue && u.LockoutEnd > now)
                    : query.OrderBy(u => u.LockoutEnabled && u.LockoutEnd.HasValue && u.LockoutEnd > now),
                _ => desc
                    ? query.OrderByDescending(u => u.FullName ?? u.Email)
                    : query.OrderBy(u => u.FullName ?? u.Email)
            };
            query = orderedQuery.ThenBy(u => u.Id);

            var totalCount = await query.CountAsync();
            var users = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var userIds = users.Select(u => u.Id).ToList();
            var rolesByUser = await _db.UserRoles
                .Where(ur => userIds.Contains(ur.UserId))
                .Join(_db.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => new { ur.UserId, RoleName = r.Name ?? "" })
                .GroupBy(x => x.UserId)
                .ToDictionaryAsync(g => g.Key, g => g.Select(x => x.RoleName).Where(r => r != "").ToList());

            var items = new List<UserListItemDto>();
            foreach (var u in users)
            {
                items.Add(new UserListItemDto
                {
                    Id = u.Id,
                    Email = u.Email!,
                    FullName = u.FullName,
                    StudentId = u.StudentId,
                    Major = u.Major,
                    AvatarUrl = u.AvatarUrl,
                    IsLocked = u.LockoutEnabled && u.LockoutEnd.HasValue && u.LockoutEnd > now,
                    Roles = rolesByUser.GetValueOrDefault(u.Id) ?? []
                });
            }

            return new PagedResult<UserListItemDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<UserDetailDto?> GetUserByIdAsync(string userId)
        {
            // IgnoreQueryFilters để admin xem cả tài khoản đã bị xoá mềm
            var user = await _db.Users
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null) return null;

            var roles = await _userManager.GetRolesAsync(user);
            var memberships = await _db.ClubMemberships
                .Include(m => m.Club)
                .Include(m => m.Department)
                .Where(m => m.UserId == userId)
                .Select(m => new UserMembershipDto
                {
                    ClubId = m.ClubId,
                    ClubName = m.Club.Name,
                    DepartmentId = m.DepartmentId,
                    DepartmentName = m.Department != null ? m.Department.Name : null,
                    ClubRole = m.ClubRole,
                    JoinedDate = m.JoinedDate,
                    Status = m.Status
                })
                .ToListAsync();

            var now = DateTimeOffset.UtcNow;
            return new UserDetailDto
            {
                Id = user.Id,
                Email = user.Email!,
                FullName = user.FullName,
                StudentId = user.StudentId,
                Major = user.Major,
                AvatarUrl = user.AvatarUrl,
                Phone = user.Phone,
                Gender = user.Gender,
                DateOfBirth = user.DateOfBirth,
                IsLocked = user.LockoutEnabled && user.LockoutEnd.HasValue && user.LockoutEnd > now,
                IsDeleted = user.IsDeleted,
                Roles = roles.ToList(),
                Memberships = memberships
            };
        }

        public async Task LockUserAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId)
                ?? throw new KeyNotFoundException("Không tìm thấy người dùng.");

            await _userManager.SetLockoutEnabledAsync(user, true);
            await _userManager.SetLockoutEndDateAsync(user, DateTimeOffset.MaxValue);

            var now = DateTime.UtcNow;
            await _db.RefreshTokens
                .Where(t => t.UserId == userId && t.RevokedAt == null && t.ExpiresAt > now)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, now));
        }

        public async Task UnlockUserAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId)
                ?? throw new KeyNotFoundException("Không tìm thấy người dùng.");

            await _userManager.SetLockoutEndDateAsync(user, null);
            await _userManager.ResetAccessFailedCountAsync(user);
        }

        public async Task SoftDeleteUserAsync(string userId, string adminId)
        {
            var user = await _userManager.FindByIdAsync(userId)
                ?? throw new KeyNotFoundException("Không tìm thấy người dùng.");

            user.IsDeleted = true;
            user.DeletedBy = adminId;
            await _userManager.UpdateAsync(user);
        }

        public async Task<UserDetailDto?> GetMeAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return null;

            var roles = await _userManager.GetRolesAsync(user);
            var memberships = await _db.ClubMemberships
                .Include(m => m.Club)
                .Include(m => m.Department)
                .Where(m => m.UserId == userId)
                .OrderBy(m => m.Status == MembershipStatus.Resigned ? 1 : 0)
                .ThenByDescending(m => m.JoinedDate)
                .Select(m => new UserMembershipDto
                {
                    ClubId = m.ClubId,
                    ClubName = m.Club.Name,
                    ClubLogoUrl = m.Club.LogoUrl,
                    DepartmentId = m.DepartmentId,
                    DepartmentName = m.Department != null ? m.Department.Name : null,
                    ClubRole = m.ClubRole,
                    JoinedDate = m.JoinedDate,
                    ResignedDate = m.ResignedDate,
                    Status = m.Status
                })
                .ToListAsync();

            return new UserDetailDto
            {
                Id = user.Id,
                Email = user.Email!,
                FullName = user.FullName,
                StudentId = user.StudentId,
                Major = user.Major,
                AvatarUrl = user.AvatarUrl,
                Phone = user.Phone,
                Gender = user.Gender,
                DateOfBirth = user.DateOfBirth,
                IsLocked = user.LockoutEnabled && user.LockoutEnd.HasValue && user.LockoutEnd > DateTimeOffset.UtcNow,
                IsDeleted = false,
                Roles = roles.ToList(),
                Memberships = memberships
            };
        }

        public async Task UpdateMeAsync(string userId, UpdateProfileDto dto)
        {
            var user = await _userManager.FindByIdAsync(userId)
                ?? throw new KeyNotFoundException("Không tìm thấy người dùng.");

            if (dto.FullName != null) user.FullName = dto.FullName;
            if (dto.StudentId != null)
            {
                var trimmed = dto.StudentId.Trim();
                if (!string.IsNullOrEmpty(user.StudentId) && user.StudentId != trimmed)
                    throw new InvalidOperationException("Mã sinh viên chỉ có thể đặt một lần. Liên hệ quản trị viên để thay đổi.");

                if (!string.IsNullOrEmpty(trimmed))
                {
                    var taken = await _db.Users.AnyAsync(u => u.StudentId == trimmed && u.Id != userId);
                    if (taken)
                        throw new InvalidOperationException("Mã sinh viên đã được sử dụng.");
                }

                user.StudentId = string.IsNullOrEmpty(trimmed) ? null : trimmed;
            }
            if (dto.Major != null) user.Major = dto.Major;
            if (dto.Phone != null) user.Phone = dto.Phone;
            if (dto.Gender != null) user.Gender = dto.Gender;
            if (dto.DateOfBirth.HasValue) user.DateOfBirth = dto.DateOfBirth;

            await _userManager.UpdateAsync(user);
        }

        public async Task ChangeRoleAsync(string userId, string newRole)
        {
            var allowed = new[] { "USER", "SUPER_ADMIN" };
            if (!allowed.Contains(newRole))
                throw new InvalidOperationException("Role không hợp lệ.");

            var user = await _userManager.FindByIdAsync(userId)
                ?? throw new KeyNotFoundException("Không tìm thấy người dùng.");

            var currentRoles = await _userManager.GetRolesAsync(user);
            if (currentRoles.Contains("SUPER_ADMIN") && newRole == "USER")
            {
                var superAdminCount = await _db.UserRoles
                    .Join(_db.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => new { ur, r })
                    .CountAsync(x => x.r.NormalizedName == "SUPER_ADMIN");
                if (superAdminCount <= 1)
                    throw new InvalidOperationException(
                        "LAST_SUPER_ADMIN: Không thể hạ cấp Super Admin cuối cùng. Hệ thống sẽ không có quản trị viên.");
            }

            var rolesToRemove = currentRoles.Where(r => r != newRole).ToList();
            if (rolesToRemove.Count > 0)
                await _userManager.RemoveFromRolesAsync(user, rolesToRemove);
            if (!currentRoles.Contains(newRole))
                await _userManager.AddToRoleAsync(user, newRole);
        }

        public async Task<UserDetailDto> CreateUserAsync(CreateUserDto dto)
        {
            if (await _userManager.FindByEmailAsync(dto.Email) != null)
                throw new InvalidOperationException($"Email '{dto.Email}' đã được sử dụng.");

            if (!string.IsNullOrWhiteSpace(dto.StudentId))
            {
                var studentIdTaken = await _db.Users.AnyAsync(u => u.StudentId == dto.StudentId);
                if (studentIdTaken)
                    throw new InvalidOperationException("Mã sinh viên đã được sử dụng.");
            }

            var user = new ApplicationUser
            {
                UserName = dto.Email,
                Email = dto.Email,
                EmailConfirmed = true,
                FullName = dto.FullName,
                StudentId = dto.StudentId,
                Major = dto.Major,
                Gender = dto.Gender,
            };

            var result = await _userManager.CreateAsync(user, dto.Password);
            if (!result.Succeeded)
                throw new InvalidOperationException(string.Join(", ", result.Errors.Select(e => e.Description)));

            var role = dto.Role == "SUPER_ADMIN" ? "SUPER_ADMIN" : "USER";
            await _userManager.AddToRoleAsync(user, role);

            return (await GetUserByIdAsync(user.Id))!;
        }

        public async Task<IEnumerable<MembershipHistoryDto>> GetMyHistoryAsync(string userId)
        {
            return await _db.ClubMemberships
                .AsNoTracking()
                .Include(m => m.Club)
                .Include(m => m.Department)
                .Where(m => m.UserId == userId)
                .OrderByDescending(m => m.JoinedDate)
                .Select(m => new MembershipHistoryDto
                {
                    MembershipId = m.Id,
                    ClubId = m.ClubId,
                    ClubName = m.Club.Name,
                    ClubLogoUrl = m.Club.LogoUrl,
                    ClubRole = m.ClubRole.ToString(),
                    DepartmentName = m.Department != null ? m.Department.Name : null,
                    Status = m.Status.ToString(),
                    JoinedDate = m.JoinedDate,
                    ResignedDate = m.ResignedDate,
                })
                .ToListAsync();
        }

        public async Task<IEnumerable<MyEventRegistrationDto>> GetMyEventRegistrationsAsync(string userId)
        {
            var now = DateTimeOffset.UtcNow;
            var items = await _db.EventRegistrations
                .AsNoTracking()
                .Where(er => er.UserId == userId && er.Event != null)
                .OrderByDescending(er => er.RegisteredAt)
                .Select(er => new MyEventRegistrationDto
                {
                    EventId = er.EventId,
                    EventName = er.Event.Name,
                    ClubId = er.Event.ClubId,
                    ClubName = er.Event.Club != null ? er.Event.Club.Name : null,
                    Location = er.Event.Location,
                    StartTime = er.Event.StartTime,
                    EndTime = er.Event.EndTime,
                    EventStatus = er.Event.Status.ToString(),
                    RegisteredAt = er.RegisteredAt,
                    Attendance = er.Attendance.ToString(),
                    CheckedInAt = er.CheckedInAt,
                    CanCancel = er.Event.Status != EventStatus.Completed
                             && er.Event.Status != EventStatus.Cancelled
                             && (er.Event.EndTime == null || er.Event.EndTime >= now),
                    CheckInCode = _db.EventCheckInCodes
                        .Where(c => c.EventRegistrationId == er.Id)
                        .Select(c => c.Code)
                        .FirstOrDefault(),
                })
                .ToListAsync();

            // Đăng ký cũ (thêm bởi ban tổ chức, trước khi có bảng mã) chưa có row mã —
            // mã là tất định nên suy ra được, không cần ghi DB trong một request GET.
            foreach (var item in items)
                item.CheckInCode ??= CheckInCodeCodec.Encode(item.EventId, userId);

            return items;
        }

        public async Task CancelMyEventRegistrationAsync(string userId, int eventId)
        {
            var reg = await _db.EventRegistrations
                .Include(er => er.Event)
                .FirstOrDefaultAsync(er => er.EventId == eventId && er.UserId == userId)
                ?? throw new KeyNotFoundException("Không tìm thấy đăng ký sự kiện.");

            var ev = reg.Event;
            var ended = ev == null
                || ev.Status == EventStatus.Completed
                || ev.Status == EventStatus.Cancelled
                || (ev.EndTime != null && ev.EndTime < DateTimeOffset.UtcNow);
            if (ended)
                throw new InvalidOperationException("Sự kiện đã kết thúc, không thể hủy tham gia.");

            // Xóa mã check-in trước (không phụ thuộc hành vi FK trên DB).
            var codes = await _db.EventCheckInCodes
                .Where(c => c.EventRegistrationId == reg.Id)
                .ToListAsync();
            if (codes.Count > 0) _db.EventCheckInCodes.RemoveRange(codes);

            _db.EventRegistrations.Remove(reg);
            await _db.SaveChangesAsync();
        }
    }
}
