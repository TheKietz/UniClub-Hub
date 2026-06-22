namespace UniClub_Hub.Membership.DTOs.Position
{
    public class ClubPositionDto
    {
        public int Id { get; set; }
        public int ClubId { get; set; }
        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public bool IsDefault { get; set; }
        public bool CanBeAssignedByDeptLead { get; set; }
        public int MemberCount { get; set; }
        public List<string> PermissionCodes { get; set; } = [];
    }

    public class CreateClubPositionDto
    {
        public int? DepartmentId { get; set; }
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public bool IsDefault { get; set; }
        public bool CanBeAssignedByDeptLead { get; set; } = true;
        public List<string> PermissionCodes { get; set; } = [];
    }

    public class UpdateClubPositionDto
    {
        public int? DepartmentId { get; set; }
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public bool IsDefault { get; set; }
        public bool CanBeAssignedByDeptLead { get; set; } = true;
    }

    public class UpdateClubPositionPermissionsDto
    {
        public List<string> PermissionCodes { get; set; } = [];
    }

    public class AssignMemberPositionsDto
    {
        public List<int> PositionIds { get; set; } = [];
    }

    public class MemberPositionsDto
    {
        public int MembershipId { get; set; }
        public string UserId { get; set; } = null!;
        public string? FullName { get; set; }
        public string Email { get; set; } = null!;
        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public List<ClubPositionDto> Positions { get; set; } = [];
    }
}
