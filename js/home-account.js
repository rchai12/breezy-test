(function () {
  'use strict';

  const Breezy = (window.Breezy = window.Breezy || {});
  const state = Breezy.flow.get();
  if (!state.account) return;

  document.querySelectorAll('.account-slot').forEach(slot => {
    slot.appendChild(accountChip(state.account, state.subscription));
  });

  function accountChip(account, subscription) {
    const fullName = `${account.firstName} ${account.lastName}`;
    const link = document.createElement('a');
    link.className = 'account-chip';
    const name = document.createElement('span');
    name.className = 'account-chip-name';
    name.textContent = fullName;
    link.appendChild(name);

    if (subscription) {
      const plan = Breezy.plans.get(subscription.planId);
      const planName = plan ? plan.name : subscription.planId;
      const badge = document.createElement('span');
      badge.className = 'plan-tier-badge';
      badge.textContent = planName;
      link.href = 'signup/confirmation.html';
      link.setAttribute('aria-label', `Signed in as ${fullName}, ${planName} plan`);
      link.appendChild(badge);
    } else {
      const action = document.createElement('span');
      action.className = 'account-chip-action';
      action.textContent = 'Finish signing up \u2192';
      link.href = 'signup/payment.html';
      link.setAttribute('aria-label', `Signed in as ${fullName}, finish signing up`);
      link.appendChild(action);
    }
    return link;
  }
})();
