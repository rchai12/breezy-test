(function () {
  'use strict';

  const Breezy = (window.Breezy = window.Breezy || {});

  function priceSpan(plan) {
    const price = document.createElement('span');
    price.className = 'plan-card-price';
    price.textContent = Breezy.plans.formatPrice(plan.priceCents);
    const interval = document.createElement('span');
    interval.className = 'plan-card-interval';
    interval.textContent = '/mo';
    price.appendChild(interval);
    return price;
  }

  function selfServeCard(plan) {
    const card = document.createElement('label');
    card.className = 'plan-card';
    card.dataset.plan = plan.id;

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'plan';
    input.value = plan.id;
    input.className = 'plan-card-input';
    card.appendChild(input);

    const radio = document.createElement('span');
    radio.className = 'plan-card-radio';
    radio.setAttribute('aria-hidden', 'true');
    card.appendChild(radio);

    const name = document.createElement('span');
    name.className = 'plan-card-name';
    name.textContent = plan.name;
    card.appendChild(name);

    card.appendChild(priceSpan(plan));

    if (plan.popular) {
      const badge = document.createElement('span');
      badge.className = 'popular-badge';
      badge.textContent = 'Most popular';
      card.appendChild(badge);
    }

    if (plan.trialDays > 0) {
      const badge = document.createElement('span');
      badge.className = 'trial-badge';
      badge.textContent = `${plan.trialDays}-day free trial`;
      card.appendChild(badge);
    }

    return card;
  }

  function contactCard(plan) {
    const card = document.createElement('div');
    card.className = 'plan-card plan-card--contact';
    card.dataset.plan = plan.id;

    const name = document.createElement('span');
    name.className = 'plan-card-name';
    name.textContent = plan.name;
    card.appendChild(name);

    card.appendChild(priceSpan(plan));

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-secondary contact-sales';
    button.textContent = Breezy.plans.ctaLabel(plan);
    card.appendChild(button);

    const note = document.createElement('p');
    note.className = 'contact-note';
    note.setAttribute('role', 'status');
    card.appendChild(note);

    button.addEventListener('click', () => {
      note.textContent = plan.contactMessage;
    });

    return card;
  }

  function render(fieldset, { plans, onSelect }) {
    plans.forEach(plan => {
      fieldset.appendChild(plan.selfServe ? selfServeCard(plan) : contactCard(plan));
    });

    fieldset.addEventListener('change', event => {
      const input = event.target;
      if (!input || input.name !== 'plan') return;
      onSelect(input.value);
    });

    return {
      setSelected(planId) {
        fieldset.querySelectorAll('.plan-card').forEach(card => {
          const input = card.querySelector('.plan-card-input');
          const selected = planId != null && card.dataset.plan === planId;
          card.classList.toggle('is-selected', selected);
          if (input) input.checked = selected;
        });
      },
      setDisabled(disabled) {
        fieldset.querySelectorAll('.plan-card-input').forEach(input => {
          input.disabled = disabled;
          input.closest('.plan-card').classList.toggle('is-disabled', disabled);
        });
      },
    };
  }

  Breezy.planPicker = { render };
})();
