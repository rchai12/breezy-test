(function () {
  'use strict';

  const Breezy = (window.Breezy = window.Breezy || {});

  function freezePlan(plan) {
    return Object.freeze({ ...plan });
  }

  function freezeRow(row) {
    return Object.freeze({
      id: row.id,
      label: row.label,
      values: Object.freeze({ ...row.values }),
    });
  }

  const list = Object.freeze([
    freezePlan({
      id: 'casual',
      name: 'Casual Breather',
      tagline: 'For the air-curious',
      priceCents: 900,
      interval: 'month',
      trialDays: 0,
      selfServe: true,
      popular: false,
      bestFor: 'People who breathe recreationally',
      contactMessage: null,
    }),
    freezePlan({
      id: 'power',
      name: 'Power Inhaler',
      tagline: 'For serious oxygen enthusiasts',
      priceCents: 2900,
      interval: 'month',
      trialDays: 7,
      selfServe: true,
      popular: true,
      bestFor: 'Committed, full-time breathers',
      contactMessage: null,
    }),
    freezePlan({
      id: 'enterprise',
      name: 'Enterprise Lung',
      tagline: 'For teams that breathe together',
      priceCents: 9900,
      interval: 'month',
      trialDays: 0,
      selfServe: false,
      popular: false,
      bestFor: 'Open-plan offices with shared lungs',
      contactMessage: '📞 Our Air Sales team will reach out within 1 business breath.',
    }),
  ]);

  const comparison = Object.freeze([
    freezeRow({
      id: 'breaths',
      label: 'Daily breaths',
      values: { casual: '23,000', power: 'Unlimited', enterprise: 'Unlimited' },
    }),
    freezeRow({
      id: 'blends',
      label: 'Atmospheric blends',
      values: { casual: 'Standard', power: '3 premium altitude', enterprise: 'Premium + custom scents' },
    }),
    freezeRow({
      id: 'nostrils',
      label: 'Nostril optimization',
      values: { casual: '1 nostril', power: 'Dual', enterprise: 'Dual' },
    }),
    freezeRow({
      id: 'support',
      label: 'Support',
      values: {
        casual: 'Email (we may reply)',
        power: 'Priority (we will reply)',
        enterprise: 'Dedicated manager',
      },
    }),
    freezeRow({
      id: 'airReport',
      label: 'Monthly Air Report™',
      values: { casual: false, power: true, enterprise: true },
    }),
    freezeRow({
      id: 'sso',
      label: 'SSO (Single Sniff-On)',
      values: { casual: false, power: false, enterprise: true },
    }),
    freezeRow({
      id: 'sla',
      label: '99.9% oxygen uptime SLA',
      values: { casual: false, power: false, enterprise: true },
    }),
  ]);

  /**
   * @param {string} id
   * @returns {object|null}
   */
  function get(id) {
    return list.find(plan => plan.id === id) || null;
  }

  /**
   * @param {number} cents
   * @returns {string}
   */
  function formatPrice(cents) {
    const dollars = cents / 100;
    if (Number.isInteger(dollars)) return `$${dollars}`;
    return `$${dollars.toFixed(2)}`;
  }

  Breezy.plans = { list, comparison, get, formatPrice };

  // Log bad comparison rows. Do not throw.
  const planIds = list.map(plan => plan.id);
  comparison.forEach(row => {
    planIds.forEach(planId => {
      const values = row.values;
      if (!values || !Object.prototype.hasOwnProperty.call(values, planId)) {
        console.error(`Comparison row "${row.id}" is missing plan id "${planId}"`);
        return;
      }
      const value = values[planId];
      if (value !== true && value !== false && typeof value !== 'string') {
        console.error(`Comparison row "${row.id}" has an invalid value for "${planId}"`);
      }
    });
  });
})();
