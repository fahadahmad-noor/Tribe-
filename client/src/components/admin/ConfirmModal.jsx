import { useState } from 'react';

/**
 * Reusable confirmation modal for destructive admin actions.
 * Replaces browser confirm() with a proper modal.
 *
 * Props:
 *  - isOpen: bool
 *  - title: string
 *  - message: string
 *  - confirmLabel: string (default "Confirm")
 *  - danger: bool (red confirm button)
 *  - withReason: bool (shows optional reason input)
 *  - onConfirm: fn(reason?) => void
 *  - onCancel: fn => void
 *  - loading: bool
 */
const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  withReason = false,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(withReason ? reason : undefined);
    setReason('');
  };

  const handleCancel = () => {
    setReason('');
    onCancel();
  };

  return (
    <div className="admin-modal-overlay" onClick={handleCancel}>
      <div className="admin-modal" onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <span style={{ fontSize: 20 }}>{danger ? '⚠️' : 'ℹ️'}</span>
          <h3 className="admin-modal-title">{title}</h3>
        </div>
        <div className="admin-modal-body">
          <p>{message}</p>
          {withReason && (
            <div className="input-group">
              <label className="input-label">Reason (optional)</label>
              <input
                className="input"
                placeholder="e.g. Spam, harassment, abuse..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                autoFocus
              />
            </div>
          )}
        </div>
        <div className="admin-modal-footer">
          <button className="btn btn-outline btn-sm" onClick={handleCancel} disabled={loading}>
            Cancel
          </button>
          <button
            className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
