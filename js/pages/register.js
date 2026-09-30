document.addEventListener('DOMContentLoaded', () => {
  if (!Breezy.flow.guard('register')) return;
  if (!Breezy.flow.storageAvailable) {
    document.querySelector('.storage-warning').hidden = false;
  }

  const state = Breezy.flow.get();
  const plan = Breezy.plans.get(state.planId);
  const reminder = document.querySelector('.plan-reminder');
  const form = document.querySelector('.register-form');
  const panel = document.querySelector('.signed-in-panel');
  const formError = document.querySelector('.form-error');
  const submitBtn = document.getElementById('submitBtn');
  const firstNameEl = document.getElementById('firstName');
  const lastNameEl = document.getElementById('lastName');
  const emailEl = document.getElementById('email');
  const passwordEl = document.getElementById('password');
  const confirmEl = document.getElementById('passwordConfirm');
  const waiverEl = document.getElementById('waiver');

  fillReminder(plan);

  const fields = wireFields();
  wireChecklist();
  wireToggles();
  document.getElementById('startOverBtn').addEventListener('click', startOver);
  if (state.account) showSignedIn(state.account);

  let submitting = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting) return;

    const results = fields.map(entry => entry.field.validateNow());
    if (results.some(valid => !valid)) {
      const firstInvalid = fields.find(entry => entry.control.getAttribute('aria-invalid') === 'true');
      if (firstInvalid) firstInvalid.control.focus();
      return;
    }

    submitting = true;
    formError.hidden = true;
    formError.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account…';
    form.setAttribute('aria-busy', 'true');

    try {
      const res = await Breezy.api.createAccount({
        firstName: firstNameEl.value,
        lastName: lastNameEl.value,
        email: emailEl.value,
        password: passwordEl.value,
        passwordConfirm: confirmEl.value,
        waiver: waiverEl.checked,
      });
      if (res.ok) {
        const data = res.data;
        Breezy.flow.update({
          account: {
            accountId: data.accountId,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
          },
        });
        window.location.href = 'payment.html';
        return;
      }
      const fieldErrors = res.error && res.error.fields;
      if (fieldErrors && Object.keys(fieldErrors).length) {
        let focused = false;
        fields.forEach(entry => {
          const message = fieldErrors[entry.name];
          if (!message) return;
          entry.field.showError(message);
          if (!focused) {
            entry.control.focus();
            focused = true;
          }
        });
      } else {
        showFormError((res.error && res.error.message) || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      showFormError('Something went wrong. Please try again.');
    }

    submitting = false;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create account';
    form.removeAttribute('aria-busy');
  });

  function wireFields() {
    const confirmField = Breezy.formField.attach(confirmEl, {
      validate: () => Breezy.validation.passwordConfirm(passwordEl.value, confirmEl.value).error,
      errorEl: document.getElementById('passwordConfirm-error'),
      debounceMs: 1000,
    });
    const entries = [
      { name: 'firstName', control: firstNameEl, field: Breezy.formField.attach(firstNameEl, {
        validate: () => Breezy.validation.firstName(firstNameEl.value).error,
        errorEl: document.getElementById('firstName-error'),
        debounceMs: 1000,
      }) },
      { name: 'lastName', control: lastNameEl, field: Breezy.formField.attach(lastNameEl, {
        validate: () => Breezy.validation.lastName(lastNameEl.value).error,
        errorEl: document.getElementById('lastName-error'),
        debounceMs: 1000,
      }) },
      { name: 'email', control: emailEl, field: Breezy.formField.attach(emailEl, {
        validate: () => Breezy.validation.email(emailEl.value).error,
        errorEl: document.getElementById('email-error'),
        debounceMs: 1000,
      }) },
      { name: 'password', control: passwordEl, field: Breezy.formField.attach(passwordEl, {
        validate: () => Breezy.validation.password(passwordEl.value).error,
        errorEl: document.getElementById('password-error'),
        debounceMs: 1000,
      }) },
      { name: 'passwordConfirm', control: confirmEl, field: confirmField },
      { name: 'waiver', control: waiverEl, field: Breezy.formField.attach(waiverEl, {
        validate: () => Breezy.validation.waiver(waiverEl.checked).error,
        errorEl: document.getElementById('waiver-error'),
        debounceMs: 1000,
      }) },
    ];
    passwordEl.addEventListener('input', () => confirmField.revalidate());
    return entries;
  }

  function wireChecklist() {
    passwordEl.addEventListener('input', () => {
      const checks = Breezy.validation.passwordChecks(passwordEl.value);
      document.querySelectorAll('.password-checks li').forEach(item => {
        item.classList.toggle('is-met', !!checks[item.dataset.check]);
      });
    });
  }

  function wireToggles() {
    document.querySelectorAll('.toggle-password').forEach(button => {
      button.addEventListener('click', () => {
        const input = document.getElementById(button.getAttribute('aria-controls'));
        const showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        button.textContent = showing ? 'Show' : 'Hide';
        button.setAttribute('aria-pressed', showing ? 'false' : 'true');
        input.focus();
      });
    });
  }

  function fillReminder(chosen) {
    const name = document.createElement('strong');
    name.textContent = chosen.name;
    const link = document.createElement('a');
    link.href = `plans.html?plan=${chosen.id}`;
    link.textContent = 'Change';
    const price = `${Breezy.plans.formatPrice(chosen.priceCents)}/mo`;
    const detail = chosen.trialDays > 0
      ? ` · free for ${chosen.trialDays} days, then ${price} · `
      : ` · ${price} · `;
    reminder.replaceChildren(name, document.createTextNode(detail), link);
  }

  function showSignedIn(account) {
    document.querySelector('.signed-in-name').textContent = `${account.firstName} ${account.lastName}`;
    document.querySelector('.signed-in-email').textContent = account.email;
    panel.hidden = false;
    form.hidden = true;
  }

  function startOver() {
    Breezy.flow.update({ account: null });
    panel.hidden = true;
    form.hidden = false;
    form.reset();
    fields.forEach(entry => entry.field.clear());
    document.querySelectorAll('.password-checks li').forEach(item => item.classList.remove('is-met'));
    document.querySelectorAll('.toggle-password').forEach(button => {
      const input = document.getElementById(button.getAttribute('aria-controls'));
      input.type = 'password';
      button.textContent = 'Show';
      button.setAttribute('aria-pressed', 'false');
    });
    firstNameEl.focus();
  }

  function showFormError(message) {
    formError.textContent = message;
    formError.hidden = false;
  }
});
