import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { subscribeToToasts, removeToast } from '../utils/notifications';

function Toast({ toast, onRemove }) {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 300);
  };

  useEffect(() => {
    if (toast.duration > 0) {
      const timer = setTimeout(() => {
        handleRemove();
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast.duration]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className={`toast ${toast.type} ${isRemoving ? 'removing' : ''}`}>
      <div className="toast-icon">{getIcon()}</div>
      <div className="toast-content">
        <div className="toast-message">{toast.message}</div>
      </div>
      <button
        type="button"
        className="toast-close"
        onClick={handleRemove}
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToToasts((newToasts) => {
      setToasts(newToasts);
    });

    return unsubscribe;
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          onRemove={removeToast}
        />
      ))}
    </div>
  );
}
