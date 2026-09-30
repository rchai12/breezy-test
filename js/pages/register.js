document.addEventListener('DOMContentLoaded', () => {
  if (!Breezy.flow.guard('register')) return;
  if (!Breezy.flow.storageAvailable) {
    document.querySelector('.storage-warning').hidden = false;
  }
});
