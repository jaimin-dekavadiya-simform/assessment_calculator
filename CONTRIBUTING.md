# Contributing to Scientific Calculator

Thanks for your interest in improving this project! You can contribute by reporting bugs, suggesting features, or submitting code and documentation changes.

## How to Contribute

1. Open a [GitHub issue](https://github.com/jaimin-dekavadiya-simform/assessment_calculator/issues) to report a bug or suggest a feature, so the change can be discussed first.
2. Fork the repository and make your changes on a branch.
3. Submit a pull request.

## Getting Started

1. Fork the repository and clone your fork:

   ```bash
   git clone <your-fork-url>
   cd assessment_calculator
   ```

2. Open `index 1.html` in your web browser.
   - No build step or server is required; all logic runs in the browser.

## Branching

- The base branch is `develop`. Create your branch from `develop`.
- Use a descriptive branch name, such as `feature/<name>` or `fix/<name>`.
- Open your pull request against `develop`.

## Project Structure and Conventions

See the [Project Structure](README.md#project-structure) section of the README for an overview of the codebase. Please follow these conventions:

- **Keep the separation of concerns.** Tokenizer, parser, evaluator, calculator, UI controller, history and utilities each have a single responsibility. Keep UI code separate from calculator logic.
- **Match the existing code style.** Use ES modules and classes as the rest of the code does.
- **Extend through the registries.** Add or change operators and functions in the `operators` and `functions` Maps in `src/calculator/operations.js`. This should not require changes to the parser or evaluator logic. See [Extending the Calculator](README.md#extending-the-calculator) for an example.

## Testing

Tests run in the browser console through `src/test/testRunner.js`.

1. In `index 1.html`, uncomment the test runner script:

   ```html
   <script src="src/test/testRunner.js" type="module" defer></script>
   ```

2. In `src/test/testRunner.js`, uncomment the tests you want to run, for example:

   ```javascript
   await import("./calculatorTest.js");
   ```

3. Reload the page and check the browser console for the results.

Add or update tests under `src/test/` for any change in behaviour.

**Before committing, comment the test runner script in `index 1.html` and the test imports in `src/test/testRunner.js` out again**, so the tests do not run in the normal app.

## Commit Messages and Pull Requests

- Write short, imperative commit messages (for example, `Add modulus operator test`).
- Keep each pull request focused on one logical change.
- In the pull request description, explain what changed and why, and reference the related issue (for example, `Closes #N`).
- Describe how you tested the change.
- Include screenshots for UI changes.

## Code of Conduct

Be respectful and constructive towards everyone who takes part in this project. Harassment and abusive behaviour will not be tolerated.
