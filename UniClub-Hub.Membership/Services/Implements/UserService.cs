using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
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
        {
            var query = _db.Users.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(u =>
                    (u.FullName != null && u.FullName.ToLower().Contains(s)) ||
                    (u.Email != null && u.Email.ToLower().Contains(s)) ||
                    (u.StudentId != null && u.StudentId.ToLower().Contains(s)));
            }

            var totalCount = await query.CountAsync();
            var users = await query
                .OrderBy(u => u.FullName)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var now = DateTimeOffset.UtcNow;
            var items = new List<UserListItemDto>();
            foreach (var u in users)
            {
                var roles = await _userManager.GetRolesAsync(u);
                items.Add(new UserListItemDto
                {
                    Id = u.Id,
                    Email = u.Email!,
                    FullName = u.FullName,
                    StudentId = u.StudentId,
                    Major = u.Major,
                    AvatarUrl = u.AvatarUrl,
                    IsLocked = u.LockoutEnabled && u.LockoutEnd.HasValue && u.LockoutEnd > now,
                    Roles = roles.ToList()
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
                .Where(m => m.UserId == userId && m.Status == MembershipStatus.Active)
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
                IsLocked = false,
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
            if (dto.StudentId != null) user.StudentId = dto.StudentId;
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
            await _userManager.RemoveFromRolesAsync(user, currentRoles);
            await _userManager.AddToRoleAsync(user, newRole);
        }

        public async Task<UserDetailDto> CreateUserAsync(CreateUserDto dto)
        {
            if (await _userManager.FindByEmailAsync(dto.Email) != null)
                throw new InvalidOperationException($"Email '{dto.Email}' đã được sử dụng.");

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
    }
}
