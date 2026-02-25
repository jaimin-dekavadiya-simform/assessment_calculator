function isDigit(char) {
  const charCode = char.charCodeAt(0);
  if (charCode >= 48 && charCode <= 57) {
    return true;
  }
  return false;
}

export { isDigit };
