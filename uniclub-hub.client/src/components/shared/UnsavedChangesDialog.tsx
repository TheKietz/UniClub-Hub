import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { D } from '@/components/shared/managementTheme'

type UnsavedChangesDialogProps = {
  open: boolean
  saving?: boolean
  title?: string
  description?: string
  onCancel: () => void
  onDiscard: () => void
  onSave: () => void
}

export function UnsavedChangesDialog({
  open,
  saving,
  title = 'Có thay đổi chưa lưu',
  description = 'Bạn có thay đổi chưa được lưu. Bạn muốn lưu trước khi rời trang không?',
  onCancel,
  onDiscard,
  onSave,
}: UnsavedChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onCancel() }}>
      <DialogContent className="sm:max-w-md" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <DialogHeader>
          <DialogTitle style={{ color: D.ink, fontWeight: 900 }}>{title}</DialogTitle>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: D.inkDim, lineHeight: 1.6 }}>
            {description}
          </p>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            style={{
              height: 40,
              padding: '0 16px',
              borderRadius: D.pill,
              border: D.borderLight,
              background: D.card,
              color: D.inkDim,
              fontSize: 13,
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Ở lại
          </button>
          <button
            type="button"
            onClick={onDiscard}
            disabled={saving}
            style={{
              height: 40,
              padding: '0 16px',
              borderRadius: D.pill,
              border: '1.5px solid #fecaca',
              background: '#fff',
              color: D.coral,
              fontSize: 13,
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Không lưu
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            style={{
              height: 40,
              padding: '0 18px',
              borderRadius: D.pill,
              border: '1.5px solid #1d4ed8',
              background: D.indigo,
              color: '#fff',
              fontSize: 13,
              fontWeight: 800,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.75 : 1,
              fontFamily: 'inherit',
            }}
          >
            {saving ? 'Đang lưu...' : 'Lưu và rời'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
