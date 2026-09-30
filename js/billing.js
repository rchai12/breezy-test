(function () {
  'use strict';

  const Breezy = (window.Breezy = window.Breezy || {});

  /**
   * Date of the first charge: start plus plan.trialDays calendar days.
   * Same day when there is no trial. Returns a new Date and does not mutate start.
   * @param {{ trialDays: number }} plan
   * @param {Date} [start]
   * @returns {Date}
   */
  function firstChargeDate(plan, start = new Date()) {
    const result = new Date(start.getTime());
    result.setDate(result.getDate() + plan.trialDays);
    return result;
  }

  /**
   * Short month and day in en-US. Adds the year when it differs from relativeTo.
   * @param {Date} date
   * @param {Date} [relativeTo]
   * @returns {string}
   */
  function formatDate(date, relativeTo = new Date()) {
    const options = { month: 'short', day: 'numeric' };
    if (date.getFullYear() !== relativeTo.getFullYear()) options.year = 'numeric';
    return date.toLocaleDateString('en-US', options);
  }

  Breezy.billing = { firstChargeDate, formatDate };
})();
