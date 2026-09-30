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
      highlights: Object.freeze([
        'Up to 23,000 breaths/day',
        'Standard atmospheric blend',
        'Email support (we may reply)',
        '1 nostril optimization',
      ]),
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
      highlights: Object.freeze([
        'Unlimited breaths',
        '3 premium altitude blends',
        'Priority support (we will reply)',
        'Dual-nostril optimization',
        'Monthly Air Report™',
      ]),
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
      highlights: Object.freeze([
        'Everything in Power Inhaler',
        'Dedicated Air Account Manager',
        'Custom scent profiles',
        'SSO (Single Sniff-On)',
        'SLA: 99.9% oxygen uptime',
      ]),
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
      values: { casual: 'Standard', power: '3 premium altitude', enterprise: '3 premium + custom scent profiles' },
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
        enterprise: 'Dedicated Air Account Manager',
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

  /**
   * Returns an array of error messages for comparison rows with missing or invalid values.
   * @param {Array<object>} rows
   * @returns {string[]}
   */
  function findDataErrors(rows) {
    const planIds = list.map(plan => plan.id);
    const errors = [];
    rows.forEach(row => {
      planIds.forEach(planId => {
        const values = row.values;
        if (!values || !Object.prototype.hasOwnProperty.call(values, planId)) {
          errors.push(`Comparison row "${row.id}" is missing plan id "${planId}"`);
          return;
        }
        const value = values[planId];
        if (value !== true && value !== false && typeof value !== 'string') {
          errors.push(`Comparison row "${row.id}" has an invalid value for "${planId}"`);
        }
      });
    });
    return errors;
  }

  /**
   * @param {{ selfServe: boolean, trialDays: number }} plan
   * @returns {string}
   */
  function ctaLabel(plan) {
    if (!plan.selfServe) return 'Contact Sales';
    if (plan.trialDays > 0) return 'Start Free Trial';
    return 'Get Started';
  }

  /**
   * Price and trial rows built from the plan list, followed by the comparison rows.
   * @returns {Array<object>}
   */
  function tableRows() {
    const priceValues = {};
    const trialValues = {};
    list.forEach(plan => {
      priceValues[plan.id] = `${formatPrice(plan.priceCents)}/mo`;
      trialValues[plan.id] = plan.trialDays > 0 ? `${plan.trialDays} days` : false;
    });
    return Object.freeze([
      freezeRow({ id: 'price', label: 'Price', values: priceValues }),
      freezeRow({ id: 'trial', label: 'Free trial', values: trialValues }),
      ...comparison,
    ]);
  }

  Breezy.plans = {
    list,
    comparison,
    get,
    formatPrice,
    ctaLabel,
    tableRows,
    _findDataErrors: findDataErrors,
  };

  findDataErrors(comparison).forEach(msg => console.error(msg));
})();
