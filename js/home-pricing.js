(function () {
  'use strict';

  const grid = document.getElementById('pricingGrid');
  if (!grid || !window.Breezy || !Breezy.plans) return;

  Breezy.plans.list.forEach(plan => {
    const card = document.createElement('div');
    card.className = plan.popular ? 'price-card popular' : 'price-card';

    if (plan.popular) {
      const tag = document.createElement('div');
      tag.className = 'popular-tag';
      tag.textContent = 'Most Popular';
      card.appendChild(tag);
    }

    const name = document.createElement('h3');
    name.textContent = plan.name;
    card.appendChild(name);

    const desc = document.createElement('p');
    desc.className = 'desc';
    desc.textContent = plan.tagline;
    card.appendChild(desc);

    const price = document.createElement('div');
    price.className = 'price';
    const sup = document.createElement('sup');
    sup.textContent = '$';
    const sub = document.createElement('sub');
    sub.textContent = '/mo';
    price.appendChild(sup);
    price.appendChild(document.createTextNode(Breezy.plans.formatPrice(plan.priceCents).slice(1)));
    price.appendChild(sub);
    card.appendChild(price);

    const list = document.createElement('ul');
    plan.highlights.forEach(text => {
      const item = document.createElement('li');
      item.textContent = text;
      list.appendChild(item);
    });
    card.appendChild(list);

    const label = Breezy.plans.ctaLabel(plan);
    if (plan.selfServe) {
      const link = document.createElement('a');
      link.className = plan.popular ? 'btn btn-primary' : 'btn btn-secondary';
      link.href = `signup/plans.html?plan=${plan.id}`;
      link.textContent = label;
      card.appendChild(link);
    } else {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-secondary';
      button.textContent = label;
      button.addEventListener('click', () => {
        if (typeof showToast === 'function') showToast(plan.contactMessage);
      });
      card.appendChild(button);
    }

    grid.appendChild(card);
  });
})();
