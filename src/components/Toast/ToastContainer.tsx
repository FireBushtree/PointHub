import Toast from './Toast'

interface ToastContainerProps {
  toasts: Array<{
    id: number
    message: string
    type: 'success' | 'error'
  }>
  onRemoveToast: (id: number) => void
}

export default function ToastContainer({ toasts, onRemoveToast }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{ transform: `translateY(${index * 10}px)` }}
        >
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => onRemoveToast(toast.id)}
          />
        </div>
      ))}
    </div>
  )
}
