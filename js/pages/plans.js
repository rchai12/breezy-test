document.addEventListener('DOMContentLoaded', () => {
  if (!Breezy.flow.guard('plans')) return;
  if (!Breezy.flow.storageAvailable) {
    document.querySelector('.storage-warning').hidden = false;
  }
  const planId = Breezy.flow.readPlanParam();
  if (!planId) return;
  const plan = Breezy.plans.get(planId);
  const line = document.createElement('p');
  line.textContent = `Preselected: ${plan.name}`;
  document.querySelector('.signup-card').appendChild(line);
});
