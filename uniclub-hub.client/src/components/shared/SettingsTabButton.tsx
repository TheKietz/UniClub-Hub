import { D } from '@/components/shared/managementTheme'

type SettingsTabButtonProps = {
  label: string
  active: boolean
  dirty?: boolean
  accentColor?: string
  onClick: () => void
}

export function SettingsTabButton({
  label,
  active,
  dirty,
  accentColor = D.indigo,
  onClick,
}: SettingsTabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: 'relative',
        padding: '9px 18px',
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        color: active ? D.ink : D.inkMuted,
        background: 'transparent',
        border: 'none',
        borderBottom: `2.5px solid ${active ? accentColor : 'transparent'}`,
        marginBottom: -2,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'color .12s',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
      {dirty ? (
        <span
          aria-label="Có thay đổi chưa lưu"
          style={{
            position: 'absolute',
            top: 6,
            right: 8,
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: D.coral,
            border: '1.5px solid #fff',
            boxShadow: '0 0 0 1px rgba(225, 29, 42, 0.25)',
          }}
        />
      ) : null}
    </button>
  )
}
