document.addEventListener('DOMContentLoaded', () => {
  if (!Breezy.flow.guard('confirmation')) return;
  if (!Breezy.flow.storageAvailable) {
    document.querySelector('.storage-warning').hidden = false;
  }

  Breezy.breathOverlay.play();

  const state = Breezy.flow.get();
  const subscription = state.subscription;
  const account = state.account;
  const plan = Breezy.plans.get(subscription.planId);
  const now = new Date();

  if (account) {
    document.querySelector('.welcome-line').textContent = `Welcome to Breezy, ${account.firstName}.`;
  }

  const summary = document.querySelector('.subscription-summary');
  addRow(summary, 'Plan', plan ? plan.name : subscription.planId);
  addRow(summary, 'Status', subscription.status === 'trialing' ? 'Free trial' : 'Active');
  addRow(summary, 'Billing', null, dd => fillBilling(dd, subscription, plan, now));
  if (account) {
    addRow(summary, 'Account', `${account.firstName} ${account.lastName} \u00B7 ${account.email}`);
  }
  addRow(summary, 'Reference', subscription.subscriptionId);

  const dialog = document.getElementById('cancelDialog');
  const cancelBtn = document.getElementById('cancelBtn');
  cancelBtn.addEventListener('click', () => {
    dialog.showModal();
  });
  document.getElementById('cancelContinue').addEventListener('click', () => {
    dialog.close();
  });
  dialog.addEventListener('close', () => {
    cancelBtn.focus();
  });

  function addRow(list, label, value, fill) {
    const row = document.createElement('div');
    row.className = 'summary-row';
    const term = document.createElement('dt');
    term.textContent = label;
    const detail = document.createElement('dd');
    if (fill) fill(detail);
    else detail.textContent = value;
    row.append(term, detail);
    list.append(row);
  }

  function fillBilling(dd, current, chosen, today) {
    const price = Breezy.plans.formatPrice(current.amountCents);
    const logo = cardLogo(current.card);
    const masked = ` \u2022\u2022\u2022\u2022 ${current.card.last4}`;
    if (current.status === 'trialing') {
      const when = Breezy.billing.formatDate(new Date(current.firstChargeAt), today);
      appendText(dd, `Your ${chosen.trialDays}-day free trial has started. We'll charge `);
      dd.append(strong(price), document.createTextNode(' to '), logo);
      appendText(dd, `${masked} on `);
      dd.append(strong(when), document.createTextNode('.'));
      return;
    }
    const started = new Date(current.startedAt);
    const chargedOn = sameDay(started, today)
      ? 'today'
      : `on ${Breezy.billing.formatDate(started, today)}`;
    const next = Breezy.billing.formatDate(Breezy.billing.addMonths(started, 1), today);
    appendText(dd, 'We charged ');
    dd.append(strong(price), document.createTextNode(' to '), logo);
    appendText(dd, `${masked} ${chargedOn}. Next charge: `);
    dd.append(strong(`${price} on ${next}`), document.createTextNode('.'));
  }

  function cardLogo(card) {
    const img = document.createElement('img');
    img.className = 'card-logo';
    img.src = `../assets/card-brands/${card.brand}.svg`;
    img.alt = Breezy.cardFormat.BRAND_NAMES[card.brand];
    img.height = 20;
    return img;
  }

  function strong(text) {
    const el = document.createElement('strong');
    el.textContent = text;
    return el;
  }

  function appendText(parent, text) {
    parent.appendChild(document.createTextNode(text));
  }

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }
});
