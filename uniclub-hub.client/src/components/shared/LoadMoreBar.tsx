interface Props {
  shown: number
  total: number
  loading?: boolean
  onLoadMore: () => void
  label?: string
}

export function LoadMoreBar({ shown, total, loading = false, onLoadMore, label = 'mục' }: Props) {
  const done = shown >= total

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      padding: '16px 0',
    }}>
      <p style={{ fontSize: 12, color: '#918c99', margin: 0 }}>
        Đang hiển thị <strong style={{ color: '#15131a' }}>{shown}</strong> / <strong style={{ color: '#15131a' }}>{total}</strong> {label}
      </p>
      {!done ? (
        <button
          onClick={onLoadMore}
          disabled={loading}
          style={{
            padding: '8px 22px', borderRadius: 999, fontSize: 12, fontWeight: 700,
            background: loading ? '#f7f6f1' : '#15131a',
            color: loading ? '#918c99' : '#facc15',
            border: '1.5px solid #15131a',
            boxShadow: loading ? 'none' : '2px 2px 0 #15131a',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', transition: 'box-shadow .1s',
          }}
        >
          {loading ? 'Đang tải...' : `Tải thêm ${Math.min(20, total - shown)} ${label}`}
        </button>
      ) : (
        <span style={{
          fontSize: 11, fontWeight: 700, color: '#918c99',
          padding: '4px 14px', borderRadius: 999,
          background: '#f7f6f1', border: '1px solid #e8e3d6',
          letterSpacing: '.04em',
        }}>
          ✓ Đã hiển thị tất cả
        </span>
      )}
    </div>
  )
}
