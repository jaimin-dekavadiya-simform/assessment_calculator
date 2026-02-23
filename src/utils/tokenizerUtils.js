function isDigit(char) {
  const charCode = char.charCodeAt(0);
  if (charCode >= 48 && charCode <= 57) {
    return true;
  }
  return false;
}
function isNegative(tokens) {
 

  if (tokens.length === 0){
    return true;
  }
  else if (tokens[tokens.length - 1].type === "CONSTANT" ||
    tokens[tokens.length - 1].type === "NUMBER" ||
    tokens[tokens.length - 1].value === ")") {
    return false;
  }
  return true;
}

export {isDigit,isNegative}