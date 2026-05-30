using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Position;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Constants;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class ClubPositionService : IClubPositionService
    {
        private readonly UniClubDbContext _db;

        public ClubPositionService(UniClubDbContext db)
        {
            _db = db;
        }

        public async Task<IReadOnlyList<ClubPositionDto>> GetAllAsync(
            int clubId,
            string requesterUserId,
            bool isSuperAdmin,
            int? departmentId = null
        )
        {
            await EnsureCanViewClubAsync(clubId, requesterUserId, isSuperAdmin);

            var query = _db.ClubPositions
                .AsNoTracking()
                .Include(p => p.Department)
                .Include(p => p.Permissions)
                .Include(p => p.MemberPositions)
                .Where(p => p.ClubId == clubId);

            if (departmentId.HasValue)
            {
                query = query.Where(p => p.DepartmentId == departmentId.Value);
            }

            var positions = await query
                .OrderBy(p => p.DepartmentId.HasValue)
                .ThenBy(p => p.Department!.Name)
                .ThenBy(p => p.Name)
                .ToListAsync();

            return positions.Select(ToDto).ToList();
        }

        public async Task<ClubPositionDto> GetByIdAsync(
            int clubId,
            int positionId,
            string requesterUserId,
            bool isSuperAdmin
        )
        {
            await EnsureCanViewClubAsync(clubId, requesterUserId, isSuperAdmin);
            var position = await LoadPositionAsync(clubId, positionId, asTracking: false);
            return ToDto(position);
        }

        public async Task<ClubPositionDto> CreateAsync(
            int clubId,
            CreateClubPositionDto dto,
            string requesterUserId,
            bool isSuperAdmin
        )
        {
            await EnsureCanManagePositionsAsync(clubId, requesterUserId, isSuperAdmin);
            ValidatePositionName(dto.Name);
            await EnsureDepartmentBelongsToClubAsync(clubId, dto.DepartmentId);
            ValidatePermissionCodes(dto.PermissionCodes);
            await EnsurePositionNameAvailableAsync(clubId, dto.DepartmentId, dto.Name, excludingPositionId: null);

            var position = new ClubPosition
            {
                ClubId = clubId,
                DepartmentId = dto.DepartmentId,
                Name = dto.Name.Trim(),
                Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
                IsDefault = dto.IsDefault,
                CanBeAssignedByDeptLead = dto.CanBeAssignedByDeptLead,
                Permissions = dto.PermissionCodes
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .Select(code => new ClubPositionPermission { PermissionCode = code.Trim() })
                    .ToList()
            };

            _db.ClubPositions.Add(position);
            await _db.SaveChangesAsync();

            return await GetByIdAsync(clubId, position.Id, requesterUserId, isSuperAdmin);
        }

        public async Task<ClubPositionDto> UpdateAsync(
            int clubId,
            int positionId,
            UpdateClubPositionDto dto,
            string requesterUserId,
            bool isSuperAdmin
        )
        {
            await EnsureCanManagePositionsAsync(clubId, requesterUserId, isSuperAdmin);
            ValidatePositionName(dto.Name);
            await EnsureDepartmentBelongsToClubAsync(clubId, dto.DepartmentId);
            await EnsurePositionNameAvailableAsync(clubId, dto.DepartmentId, dto.Name, positionId);

            var position = await LoadPositionAsync(clubId, positionId, asTracking: true);
            position.DepartmentId = dto.DepartmentId;
            position.Name = dto.Name.Trim();
            position.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
            position.IsDefault = dto.IsDefault;
            position.CanBeAssignedByDeptLead = dto.CanBeAssignedByDeptLead;

            await _db.SaveChangesAsync();
            return await GetByIdAsync(clubId, positionId, requesterUserId, isSuperAdmin);
        }

        public async Task DeleteAsync(int clubId, int positionId, string requesterUserId, bool isSuperAdmin)
        {
            await EnsureCanManagePositionsAsync(clubId, requesterUserId, isSuperAdmin);

            var position = await LoadPositionAsync(clubId, positionId, asTracking: true);
            var hasMembers = await _db.ClubMemberPositions.AnyAsync(mp => mp.PositionId == positionId);
            if (hasMembers)
            {
                throw new InvalidOperationException("Không thể xóa position đang được gán cho thành viên.");
            }

            _db.ClubPositions.Remove(position);
            await _db.SaveChangesAsync();
        }

        public async Task<ClubPositionDto> SetPermissionsAsync(
            int clubId,
            int positionId,
            UpdateClubPositionPermissionsDto dto,
            string requesterUserId,
            bool isSuperAdmin
        )
        {
            await EnsureCanManagePositionsAsync(clubId, requesterUserId, isSuperAdmin);
            ValidatePermissionCodes(dto.PermissionCodes);
            await LoadPositionAsync(clubId, positionId, asTracking: false);

            var existing = await _db.ClubPositionPermissions
                .Where(p => p.PositionId == positionId)
                .ToListAsync();

            _db.ClubPositionPermissions.RemoveRange(existing);
            var newPermissions = dto.PermissionCodes
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Select(code => new ClubPositionPermission
                {
                    PositionId = positionId,
                    PermissionCode = code.Trim()
                });
            _db.ClubPositionPermissions.AddRange(newPermissions);

            await _db.SaveChangesAsync();
            return await GetByIdAsync(clubId, positionId, requesterUserId, isSuperAdmin);
        }

        public async Task<MemberPositionsDto> GetMemberPositionsAsync(
            int clubId,
            int membershipId,
            string requesterUserId,
            bool isSuperAdmin
        )
        {
            var membership = await LoadMembershipAsync(clubId, membershipId);
            await EnsureCanViewMemberPositionsAsync(clubId, requesterUserId, isSuperAdmin, membership);

            return await BuildMemberPositionsDtoAsync(clubId, membershipId);
        }

        public async Task<MemberPositionsDto> AssignMemberPositionsAsync(
            int clubId,
            int membershipId,
            AssignMemberPositionsDto dto,
            string requesterUserId,
            bool isSuperAdmin
        )
        {
            var targetMembership = await LoadMembershipAsync(clubId, membershipId);
            var requestedPositionIds = dto.PositionIds.Distinct().ToList();
            var requestedPositions = await _db.ClubPositions
                .Where(p => p.ClubId == clubId && requestedPositionIds.Contains(p.Id))
                .ToListAsync();

            if (requestedPositions.Count != requestedPositionIds.Count)
            {
                throw new KeyNotFoundException("Có position không tồn tại trong CLB này.");
            }

            foreach (var position in requestedPositions.Where(p => p.DepartmentId.HasValue))
            {
                if (targetMembership.DepartmentId != position.DepartmentId)
                {
                    throw new InvalidOperationException("Không thể gán position thuộc ban khác cho thành viên này.");
                }
            }

            var existingAssignments = await _db.ClubMemberPositions
                .Include(mp => mp.Position)
                .Where(mp => mp.MembershipId == membershipId)
                .ToListAsync();

            if (await IsClubAdminOrSuperAdminAsync(clubId, requesterUserId, isSuperAdmin))
            {
                var existingPositionIds = existingAssignments.Select(mp => mp.PositionId).ToHashSet();

                _db.ClubMemberPositions.RemoveRange(existingAssignments
                    .Where(mp => !requestedPositionIds.Contains(mp.PositionId)));

                AddAssignments(
                    membershipId,
                    requestedPositionIds.Where(positionId => !existingPositionIds.Contains(positionId)),
                    requesterUserId
                );
            }
            else
            {
                var requesterMembership = await GetActiveMembershipAsync(clubId, requesterUserId)
                    ?? throw new UnauthorizedAccessException();

                EnsureDeptLeadCanAssign(requesterMembership, targetMembership, requestedPositions);

                var manageableAssignments = existingAssignments
                    .Where(mp =>
                        mp.Position.DepartmentId == requesterMembership.DepartmentId
                        && mp.Position.CanBeAssignedByDeptLead
                    )
                    .ToList();
                var existingPositionIds = existingAssignments.Select(mp => mp.PositionId).ToHashSet();

                _db.ClubMemberPositions.RemoveRange(manageableAssignments
                    .Where(mp => !requestedPositionIds.Contains(mp.PositionId)));

                AddAssignments(
                    membershipId,
                    requestedPositionIds.Where(positionId => !existingPositionIds.Contains(positionId)),
                    requesterUserId
                );
            }

            await _db.SaveChangesAsync();
            return await BuildMemberPositionsDtoAsync(clubId, membershipId);
        }

        private async Task<ClubPosition> LoadPositionAsync(int clubId, int positionId, bool asTracking)
        {
            var query = _db.ClubPositions
                .Include(p => p.Department)
                .Include(p => p.Permissions)
                .Include(p => p.MemberPositions)
                .Where(p => p.ClubId == clubId && p.Id == positionId);

            if (!asTracking)
            {
                query = query.AsNoTracking();
            }

            return await query.FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException($"Không tìm thấy position với ID {positionId} trong CLB này.");
        }

        private async Task<ClubMembership> LoadMembershipAsync(int clubId, int membershipId)
        {
            return await _db.ClubMemberships
                .AsNoTracking()
                .Include(m => m.User)
                .Include(m => m.Department)
                .FirstOrDefaultAsync(m =>
                    m.Id == membershipId
                    && m.ClubId == clubId
                    && (m.Status == MembershipStatus.Active || m.Status == MembershipStatus.Probation)
                )
                ?? throw new KeyNotFoundException("Không tìm thấy thành viên đang hoạt động trong CLB này.");
        }

        private async Task<MemberPositionsDto> BuildMemberPositionsDtoAsync(int clubId, int membershipId)
        {
            var membership = await _db.ClubMemberships
                .AsNoTracking()
                .Include(m => m.User)
                .Include(m => m.Department)
                .FirstAsync(m => m.Id == membershipId && m.ClubId == clubId);

            var positions = await _db.ClubMemberPositions
                .AsNoTracking()
                .Where(mp => mp.MembershipId == membershipId)
                .Include(mp => mp.Position)
                    .ThenInclude(p => p.Department)
                .Include(mp => mp.Position)
                    .ThenInclude(p => p.Permissions)
                .Include(mp => mp.Position)
                    .ThenInclude(p => p.MemberPositions)
                .Select(mp => mp.Position)
                .ToListAsync();

            return new MemberPositionsDto
            {
                MembershipId = membership.Id,
                UserId = membership.UserId,
                FullName = membership.User.FullName,
                Email = membership.User.Email ?? "",
                DepartmentId = membership.DepartmentId,
                DepartmentName = membership.Department?.Name,
                Positions = positions
                    .Select(ToDto)
                    .OrderBy(p => p.DepartmentName)
                    .ThenBy(p => p.Name)
                    .ToList()
            };
        }

        private async Task EnsureCanViewClubAsync(int clubId, string requesterUserId, bool isSuperAdmin)
        {
            if (isSuperAdmin)
            {
                await EnsureClubExistsAsync(clubId);
                return;
            }

            if (!await _db.ClubMemberships.AnyAsync(m =>
                m.ClubId == clubId
                && m.UserId == requesterUserId
                && (m.Status == MembershipStatus.Active || m.Status == MembershipStatus.Probation)))
            {
                throw new UnauthorizedAccessException();
            }
        }

        private async Task EnsureCanManagePositionsAsync(int clubId, string requesterUserId, bool isSuperAdmin)
        {
            if (!await IsClubAdminOrSuperAdminAsync(clubId, requesterUserId, isSuperAdmin))
            {
                throw new UnauthorizedAccessException();
            }
        }

        private async Task EnsureCanViewMemberPositionsAsync(
            int clubId,
            string requesterUserId,
            bool isSuperAdmin,
            ClubMembership targetMembership
        )
        {
            if (await IsClubAdminOrSuperAdminAsync(clubId, requesterUserId, isSuperAdmin))
            {
                return;
            }

            var requesterMembership = await GetActiveMembershipAsync(clubId, requesterUserId)
                ?? throw new UnauthorizedAccessException();

            if (requesterMembership.Id == targetMembership.Id)
            {
                return;
            }

            if (
                requesterMembership.ClubRole == ClubRole.DEPT_LEAD
                && requesterMembership.DepartmentId.HasValue
                && requesterMembership.DepartmentId == targetMembership.DepartmentId
            )
            {
                return;
            }

            throw new UnauthorizedAccessException();
        }

        private async Task<bool> IsClubAdminOrSuperAdminAsync(
            int clubId,
            string requesterUserId,
            bool isSuperAdmin
        )
        {
            if (isSuperAdmin)
            {
                await EnsureClubExistsAsync(clubId);
                return true;
            }

            return await _db.ClubMemberships.AnyAsync(m =>
                m.ClubId == clubId
                && m.UserId == requesterUserId
                && m.ClubRole == ClubRole.CLUB_ADMIN
                && m.Status == MembershipStatus.Active);
        }

        private async Task<ClubMembership?> GetActiveMembershipAsync(int clubId, string requesterUserId)
        {
            return await _db.ClubMemberships
                .AsNoTracking()
                .FirstOrDefaultAsync(m =>
                    m.ClubId == clubId
                    && m.UserId == requesterUserId
                    && (m.Status == MembershipStatus.Active || m.Status == MembershipStatus.Probation));
        }

        private static void EnsureDeptLeadCanAssign(
            ClubMembership requesterMembership,
            ClubMembership targetMembership,
            IReadOnlyList<ClubPosition> requestedPositions
        )
        {
            if (
                requesterMembership.ClubRole != ClubRole.DEPT_LEAD
                || !requesterMembership.DepartmentId.HasValue
            )
            {
                throw new UnauthorizedAccessException();
            }

            if (targetMembership.DepartmentId != requesterMembership.DepartmentId)
            {
                throw new UnauthorizedAccessException();
            }

            var invalidPosition = requestedPositions.FirstOrDefault(p =>
                p.DepartmentId != requesterMembership.DepartmentId || !p.CanBeAssignedByDeptLead);
            if (invalidPosition != null)
            {
                throw new InvalidOperationException("Trưởng ban chỉ được gán position được phép trong ban của mình.");
            }
        }

        private async Task EnsureClubExistsAsync(int clubId)
        {
            if (!await _db.Clubs.AnyAsync(c => c.Id == clubId))
            {
                throw new KeyNotFoundException($"Không tìm thấy CLB với ID {clubId}.");
            }
        }

        private async Task EnsureDepartmentBelongsToClubAsync(int clubId, int? departmentId)
        {
            if (!departmentId.HasValue)
            {
                return;
            }

            var exists = await _db.Departments.AnyAsync(d => d.Id == departmentId.Value && d.ClubId == clubId);
            if (!exists)
            {
                throw new KeyNotFoundException("Không tìm thấy ban trong CLB này.");
            }
        }

        private async Task EnsurePositionNameAvailableAsync(
            int clubId,
            int? departmentId,
            string name,
            int? excludingPositionId
        )
        {
            var normalizedName = name.Trim();
            var nameTaken = await _db.ClubPositions.AnyAsync(p =>
                p.ClubId == clubId
                && p.DepartmentId == departmentId
                && p.Name == normalizedName
                && (!excludingPositionId.HasValue || p.Id != excludingPositionId.Value));

            if (nameTaken)
            {
                throw new InvalidOperationException("Tên position đã tồn tại trong phạm vi này.");
            }
        }

        private static void ValidatePositionName(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                throw new ArgumentException("Tên position không được để trống.");
            }
        }

        private static void ValidatePermissionCodes(IEnumerable<string> permissionCodes)
        {
            var invalidCodes = permissionCodes
                .Where(code => string.IsNullOrWhiteSpace(code) || !ClubPermissions.IsKnown(code.Trim()))
                .ToList();

            if (invalidCodes.Count > 0)
            {
                throw new ArgumentException($"Permission không hợp lệ: {string.Join(", ", invalidCodes)}.");
            }
        }

        private void AddAssignments(int membershipId, IEnumerable<int> positionIds, string requesterUserId)
        {
            _db.ClubMemberPositions.AddRange(positionIds.Select(positionId => new ClubMemberPosition
            {
                MembershipId = membershipId,
                PositionId = positionId,
                AssignedAt = DateTime.UtcNow,
                AssignedBy = requesterUserId
            }));
        }

        private static ClubPositionDto ToDto(ClubPosition position)
        {
            return new ClubPositionDto
            {
                Id = position.Id,
                ClubId = position.ClubId,
                DepartmentId = position.DepartmentId,
                DepartmentName = position.Department?.Name,
                Name = position.Name,
                Description = position.Description,
                IsDefault = position.IsDefault,
                CanBeAssignedByDeptLead = position.CanBeAssignedByDeptLead,
                MemberCount = position.MemberPositions?.Count ?? 0,
                PermissionCodes = position.Permissions?
                    .Select(p => p.PermissionCode)
                    .OrderBy(code => code)
                    .ToList() ?? []
            };
        }
    }
}
