document.addEventListener('DOMContentLoaded', () => {
  if (!Breezy.flow.guard('plans')) return;
  if (!Breezy.flow.storageAvailable) {
    document.querySelector('.storage-warning').hidden = false;
  }

  const summary = document.querySelector('.plan-summary-text');
  const continueBtn = document.getElementById('continueBtn');
  let selectedId = null;

  const picker = Breezy.planPicker.render(document.querySelector('.plan-picker'), {
    plans: Breezy.plans.list,
    onSelect: select,
  });
  const table = Breezy.compareTable.render(document.querySelector('.compare-scroll'), {
    plans: Breezy.plans.list,
    rows: Breezy.plans.tableRows(),
  });

  const state = Breezy.flow.get();
  if (state.subscription) {
    showSubscribed(state.subscription);
    picker.setSelected(state.subscription.planId);
    picker.setDisabled(true);
    table.setHighlighted(state.subscription.planId);
    continueBtn.disabled = true;
    summary.textContent = "You're already subscribed.";
    return;
  }

  const saved = Breezy.plans.get(state.planId);
  const initial = Breezy.flow.readPlanParam() || (saved && saved.selfServe ? saved.id : null);
  if (initial) select(initial);

  continueBtn.addEventListener('click', () => {
    if (!selectedId) return;
    Breezy.flow.update({ planId: selectedId });
    window.location.href = 'register.html';
  });

  function select(id) {
    selectedId = id;
    const plan = Breezy.plans.get(id);
    picker.setSelected(id);
    table.setHighlighted(id);
    history.replaceState(null, '', '?plan=' + id);
    summary.replaceChildren();
    const name = document.createElement('strong');
    name.textContent = plan.name;
    summary.appendChild(name);
    if (plan.trialDays > 0) {
      const when = Breezy.billing.formatDate(Breezy.billing.firstChargeDate(plan));
      const price = Breezy.plans.formatPrice(plan.priceCents);
      summary.appendChild(document.createTextNode(
        `: free for ${plan.trialDays} days, then ${price}/month starting ${when}.`
      ));
    } else {
      const price = Breezy.plans.formatPrice(plan.priceCents);
      summary.appendChild(document.createTextNode(`: ${price}/month, first charge today.`));
    }
    continueBtn.disabled = false;
    continueBtn.textContent = `Continue with ${plan.name} →`;
  }

  function showSubscribed(subscription) {
    const notice = document.querySelector('.subscribed-notice');
    const plan = Breezy.plans.get(subscription.planId);
    const strong = document.createElement('strong');
    strong.textContent = plan ? plan.name : subscription.planId;
    const link = document.createElement('a');
    link.href = 'confirmation.html';
    link.textContent = 'View your subscription';
    notice.replaceChildren(
      document.createTextNode("You're already subscribed to "),
      strong,
      document.createTextNode('. '),
      link
    );
    notice.hidden = false;
  }
});
