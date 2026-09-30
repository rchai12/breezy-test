(function () {
  'use strict';

  const Breezy = (window.Breezy = window.Breezy || {});

  function fillCell(cell, value) {
    if (value === true || value === false) {
      const mark = document.createElement('span');
      mark.setAttribute('aria-hidden', 'true');
      mark.className = value ? 'compare-yes' : 'compare-no';
      mark.textContent = value ? '✓' : '—';
      const hidden = document.createElement('span');
      hidden.className = 'visually-hidden';
      hidden.textContent = value ? 'Included' : 'Not included';
      cell.append(mark, hidden);
      return;
    }
    cell.textContent = String(value);
  }

  function render(container, { plans, rows }) {
    const table = document.createElement('table');
    table.className = 'compare-table';

    const caption = document.createElement('caption');
    caption.className = 'visually-hidden';
    caption.textContent = 'Breezy plans compared feature by feature';
    table.appendChild(caption);

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    const featureHead = document.createElement('th');
    featureHead.scope = 'col';
    featureHead.className = 'feature-col';
    featureHead.textContent = 'Feature';
    headRow.appendChild(featureHead);
    plans.forEach(plan => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.dataset.plan = plan.id;
      th.textContent = plan.name;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    rows.forEach(row => {
      const tr = document.createElement('tr');
      const rowHead = document.createElement('th');
      rowHead.scope = 'row';
      rowHead.textContent = row.label;
      tr.appendChild(rowHead);
      plans.forEach(plan => {
        const td = document.createElement('td');
        td.dataset.plan = plan.id;
        fillCell(td, row.values[plan.id]);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);

    return {
      setHighlighted(planId) {
        table.querySelectorAll('[data-plan]').forEach(cell => {
          cell.classList.toggle('is-highlighted', planId != null && cell.dataset.plan === planId);
        });
      },
    };
  }

  Breezy.compareTable = { render };
})();
