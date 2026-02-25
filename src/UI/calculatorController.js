function isDigit(char) {
  const charCode = char.charCodeAt(0);
  if (charCode >= 48 && charCode <= 57) {
    return true;
  }
  return false;
}

export default class CalculatorController {
  constructor(Stack, History, calculator, view) {
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
    this.empty = true;
    this.history = new History("calc-1");
    this.lastAnswer;
    this.historyPanel = view.getElementsByClassName("history-panel")[0];
    this.actions = {
      clear: this.#clearDisplay,
      delete: this.#deleteChar,
      toggleSign: this.#toggleSign,
      reciprocal: this.#reciprocal,
      calculate: this.#handleSubmit,
    };
    this.allowSubmit = false;
    this.historyPanel
      .querySelector("#clearHistoryBtn")
      .addEventListener("click", this.#clearHistory.bind(this));
    this.historyPanel
      .getElementsByClassName("history-list")[0]
      .addEventListener("click", this.#handleHistoryClick.bind(this), {
        capturing: true,
      });
    this.#displayHistory();
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
      this.allowSubmit = true;
      this.#updateDisplay(this.#getDisplay() + " " + data.operator + " ");
    } else if (data.function) {
      this.allowSubmit = true;
      switch (data.function) {
        case "pi":
          this.#updateDisplay(this.#getDisplay() + " π ");
          break;
        case "sqrt":
          this.#updateDisplay(this.#getDisplay() + " √ ");
          break;
        case "power":
          this.#updateDisplay(this.#getDisplay() + " ^ ");
          break;
        case "factorial":
          this.#updateDisplay(this.#getDisplay() + " ! ");
          break;
        case "ans":
          if (this.lastAnswer !== undefined)
            this.#updateDisplay(this.#getDisplay() + this.lastAnswer);
          break;
        default:
          this.#updateDisplay(this.#getDisplay() + " " + data.function + " ");
          break;
      }
    } else if (data.bracket) {
      this.allowSubmit = true;
      switch (data.bracket) {
        case "left":
          this.#updateDisplay(this.#getDisplay() + " ( ");
          break;
        case "right":
          this.#updateDisplay(this.#getDisplay() + " ) ");
          break;
      }
    }
  }
  #reciprocal() {
    let str = this.display.innerHTML;
    if (isDigit(str[str.length - 1])) {
      let index = str.lastIndexOf(" ");
      if (str[index + 1] === "-") {
        str = str.slice(0, index + 1) + str.slice(index + 2);
      } else {
        str =
          str.slice(0, index + 1) + " 1 / ( " + str.slice(index + 1) + " ) ";
      }
    } else if (str[str.length - 1] === " " && str[str.length - 2] === ")") {
      let index = str.length - 3;
      let openingBracketIndex;
      let counter = 1;
      while (index >= 0 && counter != 0) {
        if (str[index] === ")") {
          counter++;
        } else if (str[index] === "(") {
          counter--;
        }
        index--;
      }
      if (counter === 0) {
        if (str[index - 1] === "-") {
          str = str.slice(0, index - 1) + str.slice(index);
        } else {
          str = str.slice(0, index) + " 1 / " + str.slice(index);
        }
      }
    }
    this.display.innerHTML = str;
  }
  #toggleSign() {
    let str = this.display.innerHTML;
    if (isDigit(str[str.length - 1])) {
      let index = str.lastIndexOf(" ");
      if (str[index + 1] === "-") {
        str = str.slice(0, index + 1) + str.slice(index + 2);
      } else {
        str = str.slice(0, index + 1) + "-" + str.slice(index + 1);
      }
    } else if (str[str.length - 1] === " " && str[str.length - 2] === ")") {
      let index = str.length - 3;
      let openingBracketIndex;
      let counter = 1;
      while (index >= 0 && counter != 0) {
        if (str[index] === ")") {
          counter++;
        } else if (str[index] === "(") {
          counter--;
        }
        index--;
      }
      if (counter === 0) {
        if (str[index - 1] === "-") {
          str = str.slice(0, index - 1) + str.slice(index + 1);
        } else {
          str = str.slice(0, index) + " -" + str.slice(index);
        }
      }
    }
    this.display.innerHTML = str;
  }

  #deleteChar() {
    let str = this.display.innerHTML;
    if (str === "0") {
      return;
    } else if (isDigit(str[str.length - 1]) || str[str.length - 1] === ".") {
      str = str.slice(0, str.length - 1);
    } else if (str[str.length - 1] === " ") {
      str = str.slice(0, str.length - 1);
      let index = str.lastIndexOf(" ");
      str = str.slice(0, index);
    } else {
      str = str.slice(0, str.length - 1);
    }

    if (str == "") {
      this.empty = true;
      this.display.innerHTML = "0";
    } else {
      this.display.innerHTML = str;
    }
  }
  #getDisplay() {
    return this.display.innerHTML;
  }
  #updateDisplay(str) {
    if (this.empty) {
      this.empty = false;
      this.display.innerHTML = str.slice(1);
    } else {
      this.display.innerHTML = str;
    }
  }
  #clearDisplay() {
    this.empty = true;
    this.display.innerHTML = 0;
  }
  #clearError() {
    if (this.error) {
      this.empty = true;
      this.display.innerHTML = "0";
    }
    this.error = false;
  }
  #handleSubmit() {
    this.#clearError();
    const str = this.display.innerHTML;
    if (!this.allowSubmit) {
      return;
    }
    try {
      const answer = this.calculator.calculate(str);
      this.historyDisplay.innerHTML = this.display.innerHTML;
      this.lastAnswer = answer;
      this.display.innerHTML = answer;
      if (!this.empty) {
        this.history.push({ expression: str, answer: answer });
      }
      this.allowSubmit = false;
      this.#displayHistory.call(this);
    } catch (e) {
      if (e.message.startsWith("Parser")) {
        this.display.innerHTML = "Invalid Expression";
      } else if (e.message.startsWith("Evaluation")) {
        this.display.innerHTML = "Invalid Expression";
      } else if (e.message.startsWith("Operator")) {
        this.display.innerHTML = "Math Error";
      } else if (e.message.startsWith("Lexer")) {
        this.display.innerHTML = "Invalid Input";
      } else {
        this.display.innerHTML = "Something Went Wrong";
      }
      console.error(e);
      this.error = true;
    }
  }
  #displayHistory() {
    const historyListElement =
      this.historyPanel.getElementsByClassName("history-list")[0];
    const historyItems = this.history.getItems();

    historyListElement.innerHTML = "";

    if (!historyItems) {
      historyListElement.innerHTML = `<p class="empty-message">No calculations yet</p>`;
      return;
    }
    for (const item of historyItems) {
      const listElement = document.createElement("div");
      listElement.className = "history-item";

      const expressionElement = document.createElement("div");
      expressionElement.className = "history-item-expression";
      expressionElement.innerHTML = item.expression;

      const resultElement = document.createElement("div");
      resultElement.className = "history-item-result";
      resultElement.innerHTML = item.answer;
      listElement.appendChild(expressionElement);
      listElement.appendChild(resultElement);

      historyListElement.appendChild(listElement);
    }
  }
  #clearHistory() {
    this.history.clear();
    this.#displayHistory();
  }
  #handleHistoryClick(e) {
    const expression =
      e.target.closest(".history-item")?.firstElementChild.innerHTML;
    if (expression) {
      this.display.innerHTML = expression;
      this.empty = false;
      this.allowSubmit = true;
    }
  }
}
