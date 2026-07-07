import type { FormField, MemberFieldDef } from '@/components/membership/services/club.types'

/** Map một trường thành viên → câu hỏi form (giữ id câu hỏi cũ nếu đã có). */
export function memberFieldToFormQuestion(memberField: MemberFieldDef, existing?: FormField): FormField {
  return {
    id: existing?.id ?? crypto.randomUUID(),
    label: memberField.label,
    type: memberField.type,
    required: memberField.required,
    options: memberField.type === 'select' ? memberField.options : undefined,
    linkedFieldId: memberField.id,
  }
}

/** Đồng bộ trường thành viên lên đầu form; giữ câu hỏi bổ sung (không liên kết) phía sau. */
export function syncMemberFieldsToFormSchema(
  memberFields: MemberFieldDef[],
  formFields: FormField[],
): FormField[] {
  const customFields = formFields.filter(f => !f.linkedFieldId)
  const syncedFields = memberFields.map(mf => {
    const existing = formFields.find(f => f.linkedFieldId === mf.id)
    return memberFieldToFormQuestion(mf, existing)
  })
  return [...syncedFields, ...customFields]
}

export function splitFormFields(fields: FormField[]) {
  return {
    memberLinked: fields.filter(f => !!f.linkedFieldId),
    custom: fields.filter(f => !f.linkedFieldId),
  }
}
