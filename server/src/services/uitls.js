'use strict';

function isDigit(char) {
  const charCode = char.charCodeAt(0);
  if (charCode >= 48 && charCode <= 57) {
    return true;
  }
  return false;
}

function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) {
    throw new Error('Factorial : Negative or non-integer values are not allowed');
  }
  if (n <= 1) {
    return 1;
  }
  return n * factorial(n - 1);
}

module.exports = { isDigit, factorial };
