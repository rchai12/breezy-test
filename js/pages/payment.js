document.addEventListener('DOMContentLoaded', () => {
  if (!Breezy.flow.guard('payment')) return;
  if (!Breezy.flow.storageAvailable) {
    document.querySelector('.storage-warning').hidden = false;
  }

  const state = Breezy.flow.get();
  const plan = Breezy.plans.get(state.planId);
  const account = state.account;
  const form = document.querySelector('.payment-form');
  const formError = document.querySelector('.form-error');
  const submitBtn = document.getElementById('submitBtn');
  const nameEl = document.getElementById('cardName');
  const numberEl = document.getElementById('cardNumber');
  const expiryEl = document.getElementById('cardExpiry');
  const cvcEl = document.getElementById('cardCvc');
  const postalEl = document.getElementById('postalCode');

  fillPayingAs(account);
  nameEl.value = `${account.firstName} ${account.lastName}`;
  renderSummary(plan);
  attachMasks();
  const fields = wireFields();
  let activeBrand = null;
  numberEl.addEventListener('input', () => updateBrands(fields.cvc));
  document.getElementById('fillTestCard').addEventListener('click', () => fillTestCard(fields));

  let submitting = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting) return;

    const entries = [fields.name, fields.number, fields.expiry, fields.cvc, fields.postal];
    const results = entries.map(entry => entry.field.validateNow());
    if (results.some(valid => !valid)) {
      const firstInvalid = entries.find(entry => entry.control.getAttribute('aria-invalid') === 'true');
      if (firstInvalid) firstInvalid.control.focus();
      return;
    }

    submitting = true;
    const label = submitBtn.textContent;
    formError.hidden = true;
    formError.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing…';
    form.setAttribute('aria-busy', 'true');

    const restore = () => {
      submitting = false;
      submitBtn.disabled = false;
      submitBtn.textContent = label;
      form.removeAttribute('aria-busy');
    };

    try {
      const tokenRes = await Breezy.api.tokenizeCard({
        cardName: nameEl.value,
        cardNumber: numberEl.value,
        cardExpiry: expiryEl.value,
        cardCvc: cvcEl.value,
        postalCode: postalEl.value,
      });
      if (!tokenRes.ok) {
        showFailure(tokenRes.error, entries);
        restore();
        return;
      }

      const subRes = await Breezy.api.createSubscription({
        accountId: account.accountId,
        planId: state.planId,
        paymentToken: tokenRes.data.token,
      });
      if (!subRes.ok) {
        showFailure(subRes.error, entries);
        restore();
        return;
      }

      Breezy.flow.update({ subscription: subRes.data });
      window.location.replace('confirmation.html');
    } catch (err) {
      showFormError('Something went wrong. Please try again.');
      restore();
    }
  });

  function fillPayingAs(person) {
    const paying = document.querySelector('.paying-as');
    const name = document.createElement('strong');
    name.textContent = `${person.firstName} ${person.lastName}`;
    paying.replaceChildren(
      document.createTextNode('Paying as '),
      name,
      document.createTextNode(` (${person.email})`)
    );
  }

  function renderSummary(chosen) {
    const aside = document.querySelector('.order-summary');
    const title = document.getElementById('summary-title');
    const planLine = document.createElement('p');
    planLine.className = 'summary-plan';
    const planName = document.createElement('span');
    planName.className = 'summary-name';
    planName.textContent = chosen.name;
    const change = document.createElement('a');
    change.href = `plans.html?plan=${chosen.id}`;
    change.textContent = 'Change';
    planLine.append(planName, change);

    const price = document.createElement('p');
    price.className = 'summary-price';
    const priceText = Breezy.plans.formatPrice(chosen.priceCents);
    price.textContent = `${priceText}/month`;

    const due = document.createElement('p');
    due.className = 'summary-due';
    const dueLabel = document.createElement('span');
    dueLabel.textContent = 'Due today';
    const dueAmount = document.createElement('strong');
    const next = document.createElement('p');
    next.className = 'summary-next';

    if (chosen.trialDays > 0) {
      dueAmount.textContent = Breezy.plans.formatPrice(0);
      const charge = Breezy.billing.firstChargeDate(chosen);
      const amount = document.createElement('strong');
      amount.textContent = priceText;
      const when = document.createElement('strong');
      when.textContent = Breezy.billing.formatDate(charge);
      next.append(
        document.createTextNode('First charge '),
        amount,
        document.createTextNode(' on '),
        when
      );
      submitBtn.textContent = 'Start free trial';
    } else {
      dueAmount.textContent = priceText;
      next.textContent = `Then ${priceText} every month`;
      submitBtn.textContent = `Pay ${priceText} and subscribe`;
    }

    due.append(dueLabel, dueAmount);
    aside.replaceChildren(title, planLine, price, due, next);
  }

  function attachMasks() {
    Breezy.maskedInput.attach(numberEl, {
      format(raw) {
        const digits = Breezy.cardFormat.digitsOnly(raw).slice(0, 19);
        return Breezy.cardFormat.formatCardNumber(digits, Breezy.cardFormat.detectBrand(digits));
      },
    });
    Breezy.maskedInput.attach(expiryEl, {
      format(raw) {
        return Breezy.cardFormat.formatExpiry(Breezy.cardFormat.digitsOnly(raw).slice(0, 4));
      },
    });
    Breezy.maskedInput.attach(cvcEl, {
      format(raw) {
        return Breezy.cardFormat.digitsOnly(raw).slice(0, 4);
      },
    });
  }

  function wireFields() {
    const cvc = {
      name: 'cardCvc',
      control: cvcEl,
      field: Breezy.formField.attach(cvcEl, {
        validate: () => Breezy.validation.cardCvc(
          cvcEl.value,
          Breezy.cardFormat.detectBrand(Breezy.cardFormat.digitsOnly(numberEl.value))
        ).error,
        errorEl: document.getElementById('cardCvc-error'),
        debounceMs: 1000,
      }),
    };
    return {
      name: field('cardName', nameEl, () => Breezy.validation.cardName(nameEl.value).error, 'cardName-error'),
      number: field('cardNumber', numberEl, () => Breezy.validation.cardNumber(numberEl.value).error, 'cardNumber-error'),
      expiry: field('cardExpiry', expiryEl, () => Breezy.validation.cardExpiry(expiryEl.value).error, 'cardExpiry-error'),
      cvc,
      postal: field('postalCode', postalEl, () => Breezy.validation.postalCode(postalEl.value).error, 'postalCode-error'),
    };
  }

  function field(name, control, validate, errorId) {
    return {
      name,
      control,
      field: Breezy.formField.attach(control, {
        validate,
        errorEl: document.getElementById(errorId),
        debounceMs: 1000,
      }),
    };
  }

  function updateBrands(cvcField) {
    const brand = Breezy.cardFormat.detectBrand(Breezy.cardFormat.digitsOnly(numberEl.value));
    document.querySelectorAll('.card-brands img').forEach(img => {
      const match = !!brand && img.dataset.brand === brand;
      img.classList.toggle('is-active', match);
      img.classList.toggle('is-dimmed', !!brand && !match);
    });
    const status = document.querySelector('.card-brand-status');
    status.textContent = brand ? `${Breezy.cardFormat.BRAND_NAMES[brand]} card` : '';
    if (brand !== activeBrand) {
      activeBrand = brand;
      cvcField.field.revalidate();
    }
  }

  function fillTestCard(entries) {
    const year = (new Date().getFullYear() % 100) + 2;
    numberEl.value = Breezy.cardFormat.formatCardNumber(Breezy.api.TEST_CARDS.visa, 'visa');
    expiryEl.value = `12/${String(year).padStart(2, '0')}`;
    cvcEl.value = '123';
    const fillPostal = postalEl.value.trim() === '';
    if (fillPostal) postalEl.value = '10001';
    numberEl.dispatchEvent(new Event('input', { bubbles: true }));
    expiryEl.dispatchEvent(new Event('input', { bubbles: true }));
    cvcEl.dispatchEvent(new Event('input', { bubbles: true }));
    if (fillPostal) postalEl.dispatchEvent(new Event('input', { bubbles: true }));
    entries.number.field.clear();
    entries.expiry.field.clear();
    entries.cvc.field.clear();
    if (fillPostal) entries.postal.field.clear();
    updateBrands(entries.cvc);
    submitBtn.focus();
  }

  function showFailure(error, entries) {
    const fieldErrors = (error && error.fields) || {};
    const names = Object.keys(fieldErrors);
    if (names.length) {
      let focused = false;
      entries.forEach(entry => {
        const message = fieldErrors[entry.name];
        if (!message) return;
        entry.field.showError(message);
        if (!focused) {
          entry.control.focus();
          focused = true;
        }
      });
    }
    if (!names.length || (error && error.code === 'CARD_DECLINED')) {
      showFormError((error && error.message) || 'Something went wrong. Please try again.');
    }
  }

  function showFormError(message) {
    formError.textContent = message;
    formError.hidden = false;
  }
});
