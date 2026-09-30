document.addEventListener('DOMContentLoaded', () => {
  if (!Breezy.flow.guard('payment')) return;
  if (!Breezy.flow.storageAvailable) {
    document.querySelector('.storage-warning').hidden = false;
  }
});
