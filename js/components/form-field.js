(function () {
  'use strict';

  const Breezy = (window.Breezy = window.Breezy || {});

  function attach(control, options) {
    const validate = options.validate;
    const errorEl = options.errorEl;
    const debounceMs = options.debounceMs;
    const isCheckbox = control.type === 'checkbox';
    let dirty = false;
    let showing = false;
    let timer = null;

    if (errorEl && errorEl.id) {
      const ids = (control.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      if (!ids.includes(errorEl.id)) ids.push(errorEl.id);
      control.setAttribute('aria-describedby', ids.join(' '));
    }

    function cancel() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    }

    function apply(message) {
      const wrapper = control.closest('.form-field');
      if (message) {
        errorEl.textContent = message;
        control.setAttribute('aria-invalid', 'true');
        if (wrapper) wrapper.classList.add('has-error');
        showing = true;
        return;
      }
      errorEl.textContent = '';
      control.removeAttribute('aria-invalid');
      if (wrapper) wrapper.classList.remove('has-error');
      showing = false;
    }

    function run() {
      cancel();
      apply(validate());
    }

    function schedule() {
      cancel();
      timer = setTimeout(run, debounceMs);
    }

    control.addEventListener(isCheckbox ? 'change' : 'input', () => {
      dirty = true;
      if (isCheckbox) {
        run();
        return;
      }
      if (showing && !validate()) {
        apply(null);
        return;
      }
      schedule();
    });

    if (!isCheckbox) {
      control.addEventListener('blur', () => {
        if (!dirty) return;
        run();
      });
    }

    return {
      validateNow() {
        dirty = true;
        const message = validate();
        cancel();
        apply(message);
        return message == null;
      },
      showError(message) {
        cancel();
        apply(message);
      },
      clear() {
        dirty = false;
        cancel();
        apply(null);
      },
      revalidate() {
        if (!dirty) return;
        schedule();
      },
    };
  }

  Breezy.formField = { attach };
})();
