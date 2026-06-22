export const CLUB_PERMISSIONS = {
  // Org chart & positions (Phase 1 — done)
  ORG_CHART_VIEW: 'membership.org_chart.view',
  ORG_CHART_MANAGE: 'membership.org_chart.manage',
  POSITIONS_MANAGE: 'membership.positions.manage',
  POSITION_ASSIGNMENTS_MANAGE: 'membership.position_assignments.manage',

  // Members (Phase 2 — done)
  MEMBERS_VIEW: 'membership.members.view',
  MEMBERS_MANAGE: 'membership.members.manage',
  MEMBER_KPI_VIEW: 'membership.member_kpi.view',
  MEMBER_KPI_MANAGE: 'membership.member_kpi.manage',
  MEMBER_IMPORT_EXPORT: 'membership.members.import_export',
  ROLE_SUGGESTIONS_USE: 'membership.role_suggestions.use',

  // Applications (Phase 3)
  APPLICATIONS_VIEW: 'membership.applications.view',
  APPLICATIONS_REVIEW: 'membership.applications.review',

  // Departments (Phase 4)
  DEPARTMENTS_MANAGE: 'membership.departments.manage',

  // Settings & pipeline (Phase 5)
  RECRUITMENT_PIPELINE_MANAGE: 'membership.recruitment_pipeline.manage',
  RECRUITMENT_FORM_MANAGE: 'membership.recruitment_form.manage',
  RESIGNATIONS_VIEW: 'membership.resignations.view',
  RESIGNATIONS_REVIEW: 'membership.resignations.review',
  NOTIFICATION_SETTINGS_MANAGE: 'notifications.settings.manage',
  CLUB_SETTINGS_MANAGE: 'club.settings.manage',

  // Audit log (Phase 6)
  CLUB_AUDIT_LOG_VIEW: 'club.audit_log.view',
} as const
