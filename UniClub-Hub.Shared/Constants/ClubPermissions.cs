namespace UniClub_Hub.Shared.Constants
{
    public sealed record ClubPermissionDefinition(
        string Code,
        string Name,
        string Description,
        string Group,
        string Module
    );

    public static class ClubPermissions
    {
        // Membership
        public const string MembersView = "membership.members.view";
        public const string MembersManage = "membership.members.manage";
        public const string MemberHistoryView = "membership.member_history.view";
        public const string MemberLifecycleManage = "membership.member_lifecycle.manage";
        public const string MemberKpiView = "membership.member_kpi.view";
        public const string MemberKpiManage = "membership.member_kpi.manage";
        public const string MemberImportExport = "membership.members.import_export";
        public const string DepartmentsManage = "membership.departments.manage";
        public const string ApplicationsView = "membership.applications.view";
        public const string ApplicationsReview = "membership.applications.review";
        public const string RecruitmentPipelineManage = "membership.recruitment_pipeline.manage";
        public const string RecruitmentFormManage = "membership.recruitment_form.manage";
        public const string ResignationsView = "membership.resignations.view";
        public const string ResignationsReview = "membership.resignations.review";
        public const string OrgChartView = "membership.org_chart.view";
        public const string OrgChartManage = "membership.org_chart.manage";
        public const string PositionsManage = "membership.positions.manage";
        public const string PositionAssignmentsManage = "membership.position_assignments.manage";
        public const string ReportsView = "membership.reports.view";
        public const string ReportsExport = "membership.reports.export";
        public const string RoleSuggestionsUse = "membership.role_suggestions.use";
        public const string ClubSettingsManage = "club.settings.manage";
        public const string ClubAuditLogView = "club.audit_log.view";
        public const string ClubProfileManage = "club.profile.manage";

        // Operations
        public const string OperationsDashboardView = "operations.dashboard.view";
        public const string TasksView = "operations.tasks.view";
        public const string TasksManage = "operations.tasks.manage";
        public const string SprintsManage = "operations.sprints.manage";
        public const string EventsView = "operations.events.view";
        public const string EventsManage = "operations.events.manage";
        public const string EventParticipantsManage = "operations.event_participants.manage";
        public const string WorkloadView = "operations.workload.view";

        // Portal
        public const string PortalLandingPageManage = "portal.landing_page.manage";
        public const string PortalContentView = "portal.content.view";
        public const string PortalContentManage = "portal.content.manage";
        public const string PortalContentReview = "portal.content.review";
        public const string PortalMediaManage = "portal.media.manage";
        public const string PortalSeoManage = "portal.seo.manage";
        public const string PortalTemplateManage = "portal.template.manage";
        public const string PortalAnalyticsView = "portal.analytics.view";
        public const string PortalSocialManage = "portal.social.manage";
        public const string PortalRecommendationsManage = "portal.recommendations.manage";

        // Notification settings
        public const string NotificationsView = "notifications.view";
        public const string NotificationSettingsManage = "notifications.settings.manage";

        public static readonly IReadOnlyList<ClubPermissionDefinition> All =
        [
            new(MembersView, "Xem thanh vien", "Xem danh sach va thong tin thanh vien trong CLB.", "Thanh vien", "Membership"),
            new(MembersManage, "Quan ly thanh vien", "Them, cap nhat vai tro, chuyen ban hoac xoa thanh vien.", "Thanh vien", "Membership"),
            new(MemberHistoryView, "Xem lich su tham gia", "Xem qua trinh tham gia, thay doi vai tro va lich su hoat dong cua thanh vien.", "Thanh vien", "Membership"),
            new(MemberLifecycleManage, "Quan ly vong doi thanh vien", "Cap nhat trang thai ung tuyen, thu viec, chinh thuc, roi CLB.", "Thanh vien", "Membership"),
            new(MemberKpiView, "Xem KPI thanh vien", "Xem diem danh gia, dong gop va hieu qua tham gia cua thanh vien.", "Danh gia", "Membership"),
            new(MemberKpiManage, "Quan ly KPI thanh vien", "Tao va cap nhat tieu chi, diem danh gia va nhan xet thanh vien.", "Danh gia", "Membership"),
            new(MemberImportExport, "Import/Export thanh vien", "Nhap va xuat danh sach thanh vien bang Excel hoac CSV.", "Thanh vien", "Membership"),
            new(DepartmentsManage, "Quan ly ban bo phan", "Tao, sua, xoa ban va gan truong ban.", "Co cau to chuc", "Membership"),
            new(ApplicationsView, "Xem don dang ky", "Xem danh sach don ung tuyen vao CLB.", "Tuyen thanh vien", "Membership"),
            new(ApplicationsReview, "Duyet don dang ky", "Chuyen vong, chap nhan hoac tu choi don ung tuyen.", "Tuyen thanh vien", "Membership"),
            new(RecruitmentPipelineManage, "Quan ly quy trinh tuyen", "Cau hinh cac vong tuyen va luong xu ly don ung tuyen.", "Tuyen thanh vien", "Membership"),
            new(RecruitmentFormManage, "Quan ly form dang ky", "Cau hinh cau hoi va truong du lieu trong form dang ky CLB.", "Tuyen thanh vien", "Membership"),
            new(ResignationsView, "Xem don tu chuc", "Xem danh sach don xin roi vai tro hoac roi CLB.", "Nhan su", "Membership"),
            new(ResignationsReview, "Duyet don tu chuc", "Chap nhan hoac tu choi don tu chuc.", "Nhan su", "Membership"),
            new(OrgChartView, "Xem so do to chuc", "Xem co cau to chuc va cac vi tri trong CLB.", "Co cau to chuc", "Membership"),
            new(OrgChartManage, "Quan ly so do to chuc", "Cap nhat co cau, vi tri va nguoi dam nhiem.", "Co cau to chuc", "Membership"),
            new(PositionsManage, "Quan ly position", "Tao, sua, xoa position va cau hinh permission cho tung position.", "Co cau to chuc", "Membership"),
            new(PositionAssignmentsManage, "Gan position", "Gan hoac go position cho thanh vien trong pham vi duoc phep.", "Co cau to chuc", "Membership"),
            new(ReportsView, "Xem bao cao", "Xem thong ke thanh vien, don dang ky, hoat dong va phan bo vai tro.", "Bao cao", "Membership"),
            new(ReportsExport, "Xuat bao cao", "Xuat du lieu bao cao phuc vu tong ket va danh gia CLB.", "Bao cao", "Membership"),
            new(RoleSuggestionsUse, "Dung goi y vai tro", "Su dung goi y rule-based/AI de de xuat vai tro hoac ban phu hop.", "Nhan su", "Membership"),
            new(ClubSettingsManage, "Quan ly cai dat CLB", "Cap nhat thong tin, form, quy trinh va cau hinh CLB.", "Cai dat", "Membership"),
            new(ClubAuditLogView, "Xem lich su thay doi", "Xem lich su thao tac va thay doi trong CLB.", "Kiem soat", "Membership"),
            new(ClubProfileManage, "Quan ly thong tin CLB", "Cap nhat ten, ma, linh vuc, logo, mo ta, lien he va giang vien phu trach.", "Cai dat", "Membership"),

            new(OperationsDashboardView, "Xem dashboard van hanh", "Xem tong quan cong viec, su kien, tien do va nhac viec cua CLB.", "Tong quan", "Operations"),
            new(TasksView, "Xem cong viec", "Xem task, bang cong viec va tien do.", "Cong viec", "Operations"),
            new(TasksManage, "Quan ly cong viec", "Tao, sua, phan cong va cap nhat task.", "Cong viec", "Operations"),
            new(SprintsManage, "Quan ly sprint", "Tao va cau hinh sprint, backlog va cot kanban.", "Cong viec", "Operations"),
            new(EventsView, "Xem su kien", "Xem danh sach va chi tiet su kien cua CLB.", "Su kien", "Operations"),
            new(EventsManage, "Quan ly su kien", "Tao, sua, xoa va phan cong nhan su su kien.", "Su kien", "Operations"),
            new(EventParticipantsManage, "Quan ly nguoi tham gia", "Quan ly danh sach dang ky, tham du va tong ket nguoi tham gia su kien.", "Su kien", "Operations"),
            new(WorkloadView, "Xem workload", "Xem phan bo cong viec, tai cong viec va nguy co tre deadline.", "Cong viec", "Operations"),

            new(PortalLandingPageManage, "Quan ly landing page", "Cau hinh noi dung gioi thieu, thanh tich, hoat dong noi bat va thong tin lien he cua CLB.", "Landing page", "Portal"),
            new(PortalContentView, "Xem noi dung cong khai", "Xem bai viet va noi dung cong khai cua CLB.", "Noi dung", "Portal"),
            new(PortalContentManage, "Quan ly noi dung", "Tao, sua, an hien bai viet va noi dung gioi thieu.", "Noi dung", "Portal"),
            new(PortalContentReview, "Duyet noi dung", "Kiem duyet va phe duyet bai viet, tin tuc hoac thong bao truoc khi cong khai.", "Noi dung", "Portal"),
            new(PortalMediaManage, "Quan ly hinh anh", "Tai len va quan ly anh, banner, media cua CLB.", "Noi dung", "Portal"),
            new(PortalSeoManage, "Quan ly SEO", "Cau hinh tieu de, mo ta, slug va thong tin SEO co ban.", "Landing page", "Portal"),
            new(PortalTemplateManage, "Quan ly template", "Chon va cau hinh mau hien thi landing page cua CLB.", "Landing page", "Portal"),
            new(PortalAnalyticsView, "Xem analytics", "Xem luot truy cap, tuong tac va hieu qua truyen thong cua trang CLB.", "Bao cao", "Portal"),
            new(PortalSocialManage, "Quan ly mang xa hoi", "Cap nhat lien ket mang xa hoi va kenh truyen thong cua CLB.", "Truyen thong", "Portal"),
            new(PortalRecommendationsManage, "Quan ly goi y CLB", "Cau hinh hoac xem ket qua goi y CLB phu hop cho sinh vien.", "Goi y", "Portal"),

            new(NotificationsView, "Xem thong bao", "Xem thong bao web va lich su thong bao lien quan den CLB.", "Thong bao", "Membership"),
            new(NotificationSettingsManage, "Quan ly thong bao", "Cau hinh nguoi nhan, kenh va mau thong bao cua CLB.", "Thong bao", "Membership"),
        ];

        public static readonly IReadOnlyDictionary<string, ClubPermissionDefinition> ByCode =
            All.ToDictionary(permission => permission.Code, StringComparer.OrdinalIgnoreCase);

        public static bool IsKnown(string code) => ByCode.ContainsKey(code);
    }
}
