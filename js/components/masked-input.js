(function () {
  'use strict';

  const Breezy = (window.Breezy = window.Breezy || {});

  function digitCount(value, end) {
    const slice = end == null ? value : value.slice(0, end);
    return (slice.match(/\d/g) || []).length;
  }

  function caretAfterDigits(formatted, count) {
    if (count <= 0) return 0;
    let seen = 0;
    for (let i = 0; i < formatted.length; i += 1) {
      if (/\d/.test(formatted[i])) {
        seen += 1;
        if (seen === count) return i + 1;
      }
    }
    return formatted.length;
  }

  /**
   * Reformats an input as the user types, pastes, or deletes, keeping the cursor
   * on the same digit. Backspace over a separator also removes the digit before it.
   * @param {HTMLInputElement} input
   * @param {{ format: (raw: string) => string }} options
   */
  function attach(input, options) {
    const format = options.format;
    let previous = input.value;

    input.addEventListener('input', event => {
      let source = input.value;
      const cursor = input.selectionStart == null ? source.length : input.selectionStart;
      let count = digitCount(source, cursor);
      const currentDigits = digitCount(source);
      const previousDigits = digitCount(previous);
      if (event.inputType === 'deleteContentBackward' && currentDigits === previousDigits && count > 0) {
        const digits = source.replace(/\D/g, '');
        source = digits.slice(0, count - 1) + digits.slice(count);
        count -= 1;
      }
      const formatted = format(source);
      input.value = formatted;
      const next = caretAfterDigits(formatted, count);
      input.setSelectionRange(next, next);
      previous = formatted;
    });
  }

  Breezy.maskedInput = { attach };
})();
