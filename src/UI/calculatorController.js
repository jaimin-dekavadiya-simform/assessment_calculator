import { isDigit } from "../utils/uitls.js";

// Controller for the calculator UI: wires view, input, history and calculator logic.
// Responsible for translating clicks/keys into tokens, updating display and managing history.
export default class CalculatorController {
  // Initialize controller with Stack, History, calculator logic and DOM view.
  // Sets up state flags, action map and binds event handlers.
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

  // Toggle page theme (light/dark).
  // Simple UI toggle that flips a CSS class on the body element.
  #changeTheme(e) {
    document.getElementsByTagName("body")[0].classList.toggle("dark-mode");
  }

  // Cache important DOM elements used by the controller.
  // Keeps references to display, history panel, buttons and theme control.
  #initDom() {
    this.themeBtn = this.view.getElementsByClassName("theme-btn")[0];
    this.display = this.view
      .getElementsByClassName("display-area")[0]
      .getElementsByClassName("current-display")[0];
    this.historyDisplay = this.view
      .getElementsByClassName("display-area")[0]
      .getElementsByClassName("history-display")[0];
    this.buttons = this.view.getElementsByClassName("button-grid")[0];
    this.historyPanel = this.view.getElementsByClassName("history-panel")[0];
  }

  // Attach click handlers for buttons and history controls.
  // Uses event delegation on the button grid and history list.
  #initClickHandlers() {
    this.themeBtn.addEventListener("click", this.#changeTheme.bind(this));
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

  // Attach keyboard handlers for global keydown events.
  // Converts user keystrokes into the same data shape produced by clicks.
  #initKeyHandlers() {
    document.addEventListener("keydown", this.#handleKeyDown.bind(this));
  }

  // Convert raw key events into input actions (numbers, operators, brackets, functions).
  // Maps special keys (Enter/C/Backspace) to controller actions; prevents default browser behavior.
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
          return;
      }
    }
    this.#clearError();
    this.#handleInput(data);
    e.preventDefault();
  }

  // Generic click handler: clears transient error and delegates to input processor.
  #handleClick(e) {
    this.#clearError();
    const data = e.target.dataset;
    this.#handleInput(data);
  }

  // Central input router: dispatches numbers/operators/functions/brackets/actions.
  // Updates display and sets allowSubmit when an input that can finish an expression is added.
  #handleInput(data) {
    if (data.action) {
      this.actions[data.action].call(this);
    } else if (data.number) {
      this.#updateDisplay(this.#getDisplay() + data.number);
    } else if (data.operator) {
      this.allowSubmit = true;
      this.#updateDisplay(this.#getDisplay() + " " + data.operator + " ");
    } else if (data.function) {
      switch (data.function) {
        case "pi":
          this.allowSubmit = true;
          this.#updateDisplay(this.#getDisplay() + " π ");
          break;
        case "sqrt":
          this.allowSubmit = true;
          this.#updateDisplay(this.#getDisplay() + " √ ");
          break;
        case "power":
          this.allowSubmit = true;
          this.#updateDisplay(this.#getDisplay() + " ^ ");
          break;
        case "factorial":
          this.allowSubmit = true;
          this.#updateDisplay(this.#getDisplay() + " ! ");
          break;
        case "ans":
          if (this.lastAnswer !== undefined)
            this.#updateDisplay(this.#getDisplay() + this.lastAnswer);
          break;
        default:
          this.allowSubmit = true;
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

  // Replace the last operand with its reciprocal (1/x). Handles plain numbers and parenthesized expressions.
  // Traverses backwards to find the last token or matching opening bracket and wraps appropriately.
  #reciprocal() {
    let str = this.display.innerHTML;
    if (isDigit(str[str.length - 1])) {
      let index = str.lastIndexOf(" ");

      str = str.slice(0, index + 1) + " 1 / ( " + str.slice(index + 1) + " ) ";
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
        str = str.slice(0, index) + " 1 / " + str.slice(index);
      }
    }
    this.allowSubmit = true;
    this.display.innerHTML = str;
  }

  // Toggle sign of the last operand or parenthesized expression.
  // Finds the start of the last operand (or matching '(') and inserts/removes a leading dash.
  #toggleSign() {
    let str = this.display.innerHTML;
    if (isDigit(str[str.length - 1])) {
      this.allowSubmit = true;
      let index = str.lastIndexOf(" ");
      if (str[index + 1] === "-") {
        str = str.slice(0, index + 1) + str.slice(index + 2);
      } else {
        str = str.slice(0, index + 1) + "-" + str.slice(index + 1);
      }
    } else if (str[str.length - 1] === " " && str[str.length - 2] === ")") {
      this.allowSubmit = true;
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

  // Delete last character or token from display, handling numbers, spaces and grouped tokens.
  // Ensures display resets to "0" when emptied and updates empty flag.
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

  // Read-only accessor for current display contents.
  #getDisplay() {
    return this.display.innerHTML;
  }

  // Update display string; if previously empty, remove leading placeholder.
  #updateDisplay(str) {
    if (this.empty) {
      this.empty = false;
      this.display.innerHTML = str.slice(1);
    } else {
      this.display.innerHTML = str;
    }
  }

  // Clear display to initial state "0".
  #clearDisplay() {
    this.empty = true;
    this.display.innerHTML = 0;
  }

  // Clear any error state and reset display to start if necessary.
  #clearError() {
    if (this.error) {
      this.empty = true;
      this.display.innerHTML = "0";
    }
    this.error = false;
  }

  // Evaluate the current expression via calculator.calculate(), update history and display.
  // Catches and classifies errors (Lexer/Parser/Evaluation/Operator) and sets appropriate messages.
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

  // Render saved history items into the history panel.
  // If no items, show a friendly empty message.
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

  // Clear persisted history and refresh the display.
  #clearHistory() {
    this.history.clear();
    this.#displayHistory();
  }

  // Handle clicks on a history entry: restore the expression to the display for editing/recalculation.
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
