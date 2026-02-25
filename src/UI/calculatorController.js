import { isDigit } from "../utils/uitls.js";

export default class CalculatorController {
  constructor(Stack, History, calculator, view) {
    this.view = view;
    this.calculator = calculator;
    this.history = new History("calc-1");
    this.#initDom();
    this.#initClickHandlers();
    this.#initKeyHandlers();
    this.error = false;
    this.empty = true;
    this.lastAnswer;
    this.actions = {
      clear: this.#clearDisplay,
      delete: this.#deleteChar,
      toggleSign: this.#toggleSign,
      reciprocal: this.#reciprocal,
      calculate: this.#handleSubmit,
    };
    this.allowSubmit = false;
    this.#displayHistory();
  }
  #initDom() {
    this.display = this.view
      .getElementsByClassName("display-area")[0]
      .getElementsByClassName("current-display")[0];
    this.historyDisplay = this.view
      .getElementsByClassName("display-area")[0]
      .getElementsByClassName("history-display")[0];
    this.buttons = this.view.getElementsByClassName("button-grid")[0];
    this.historyPanel = this.view.getElementsByClassName("history-panel")[0];
  }
  #initClickHandlers() {
    this.buttons.addEventListener("click", this.#handleClick.bind(this));
    this.historyPanel
      .querySelector("#clearHistoryBtn")
      .addEventListener("click", this.#clearHistory.bind(this));
    this.historyPanel
      .getElementsByClassName("history-list")[0]
      .addEventListener("click", this.#handleHistoryClick.bind(this), {
        capturing: true,
      });
  }
  #initKeyHandlers() {
    document.addEventListener("keydown", this.#handleKeyDown.bind(this));
  }
  #handleKeyDown(e) {
    const key = e.key;
    const data = {};
    if (isDigit(key)) {
      data.number = key;
    } else if (["+", "-", "*", "/", "%"].includes(key)) {
      data.operator = key;
    } else if (["(", ")"].includes(key)) {
      data.bracket = key === "(" ? "left" : "right";
    } else {
      switch (key) {
        case "Enter":
          data.action = "calculate";
          break;
        case "c":
          data.action = "clear";
          break;
        case "Backspace":
          data.action = "delete";
          break;
        case ".":
          data.number = ".";
          break;
        case "^":
          data.function = "power";
          break;
        case "a":
          data.function = "ans";
          break;
        default:
          console.log("key not recognized");
          return;
      }
    }
    this.#handleInput(data);
    e.preventDefault();
  }
  #handleClick(e) {
    this.#clearError();
    const data = e.target.dataset;
    this.#handleInput(data);
  }
  #handleInput(data) {
    if (data.action) {
      this.actions[data.action].call(this);
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
    } else {
      console.error("Invalid Click");
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
