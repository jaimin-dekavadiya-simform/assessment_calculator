export default class CalculatorController {
  constructor(Stack, calculator, view) {
    this.calculator = calculator;
    this.handleClick = this.handleClick.bind(this);
    this.display = view
      .getElementsByClassName("display-area")[0]
      .getElementsByClassName("current-display")[0];
    this.historyDisplay = view
      .getElementsByClassName("display-area")[0]
      .getElementsByClassName("history-display")[0];
    this.buttons = view.getElementsByClassName("button-grid")[0];
    this.buttons.addEventListener("click", this.handleClick);
    this.error = false;
    this.actions = {
      clear: this.#clearDisplay,
      delete: this.#deleteChar,
      toggleSign: this.#toggleSign,
      reciprocal: this.#reciprocal,
      calculate: this.#handleSubmit,
    };
  }
  handleClick(e) {
    this.#clearError();
    const data = e.target.dataset;
    if (data.action) {
      console.log(data.action);
      this.actions[data.action].apply(this);
    } else if (data.number) {
      this.#updateDisplay(this.#getDisplay() + data.number);
    } else if (data.operator) {
      this.#updateDisplay(this.#getDisplay() + " " + data.operator + " ");
    } else if (data.function) {
    }
  }
  #reciprocal() {}
  #toggleSign() {}
  #deleteChar() {}
  #getDisplay() {
    return this.display.innerHTML;
  }
  #updateDisplay(str) {
    this.display.innerHTML = str;
  }
  #clearDisplay() {
    this.display.innerHTML = 0;
  }
  #clearError() {
    if (this.error) {
      this.display.innerHTML = "";
    }
    this.error = false;
  }
  #handleSubmit() {
    const str = this.display.innerHTML;
    try {
      const answer = this.calculator.calculate(str);
      this.historyDisplay.innerHTML = this.display.innerHTML;
      this.display.innerHTML = answer;
    } catch (e) {
      this.error = true;
      this.display.innerHTML = e.message;
    }
  }
}
