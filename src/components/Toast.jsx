import { useEffect } from 'react';
import './Toast.css';

const Toast = ({ show, message, onClose }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  return (
    <div className={`toast-notification ${show ? 'show' : ''}`}>
      <div className="toast-icon">✓</div>
      <div className="toast-content">
        <div className="toast-title">Confirmación enviada</div>
        <div className="toast-message">{message}</div>
      </div>
    </div>
  );
};

export default Toast;
