namespace UniClub_Hub.Membership.Services.Roles
{
    public sealed record RoleSuggestionContext(
        ClubSignal Club,
        MemberSignal Member,
        List<DepartmentSignal> Departments,
        List<int> CurrentDeptLeadDepartmentIds,
        ContributionSignal Contribution,
        TaskSignal Tasks,
        ApplicationSignal? Application,
        KpiSignal? Kpi,
        List<PositionSignal> Positions
    );

    public sealed record ClubSignal(int Id, string Name, string? Description);

    public sealed record MemberSignal(
        int MembershipId,
        string UserId,
        string Name,
        string? StudentId,
        string? Major,
        string CurrentRole,
        int? DepartmentId,
        string? DepartmentName,
        string Status,
        DateOnly JoinedDate,
        string? CustomDataJson
    );

    public sealed record DepartmentSignal(int Id, string Name, string? Description);

    public sealed record ContributionSignal(int TotalPoints, int Count, List<string> RecentNotes);

    public sealed record TaskSignal(int Total, int Done, int Overdue, double AverageProgress);

    public sealed record ApplicationSignal(
        string? AnswersJson,
        string? MemberFieldDataJson,
        string? ReviewNote
    );

    public sealed record KpiSignal(
        double TotalScore,
        string Grade,
        int Rank,
        List<MetricSnapshot> Metrics
    );

    public sealed record MetricSnapshot(
        string Key,
        string DisplayName,
        double RawScore,
        int Weight
    );

    public sealed record PositionSignal(
        int Id,
        string Name,
        string? DepartmentName
    );
}
