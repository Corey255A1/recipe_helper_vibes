const ConfirmModal = {
  show({ title = 'Confirm Action', message = 'Are you sure?', confirmText = 'Confirm', danger = true, onConfirm }) {
    let modal = document.getElementById('confirm-modal');
    if (!modal) return;

    document.getElementById('confirm-modal-title').textContent = title;
    document.getElementById('confirm-modal-message').textContent = message;
    
    const confirmBtn = document.getElementById('confirm-modal-action');
    confirmBtn.textContent = confirmText;
    confirmBtn.style.background = danger ? 'var(--danger)' : 'var(--primary)';
    
    const cancelBtn = document.getElementById('confirm-modal-cancel');

    const close = () => {
      modal.classList.remove('open');
      confirmBtn.onclick = null;
      cancelBtn.onclick = null;
    };

    cancelBtn.onclick = () => close();
    confirmBtn.onclick = async () => {
      close();
      if (onConfirm) await onConfirm();
    };

    modal.classList.add('open');
  }
};
