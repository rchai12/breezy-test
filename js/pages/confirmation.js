document.addEventListener('DOMContentLoaded', () => {
  if (!Breezy.flow.guard('confirmation')) return;
  if (!Breezy.flow.storageAvailable) {
    document.querySelector('.storage-warning').hidden = false;
  }
});
