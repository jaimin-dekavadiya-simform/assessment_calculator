import Stack from "../utils/stack.js";

console.log("===== STACK TESTS START =====");

// ===============================
// TEST HELPER
// ===============================

function runStackTest(name, fn, expected) {
  try {
    const result = fn();
    const pass =
      typeof expected === "function" ? expected(result) : result === expected;

    console.log("====================================");
    console.log("Test:", name);
    console.log("Expected:", expected);
    console.log("Result  :", result);
    console.log(pass ? "✅ PASS" : "❌ FAIL");
  } catch (err) {
    console.log("====================================");
    console.log("Test:", name);
    console.log("Expected:", expected);
    console.log("Result  : ERROR ->", err.message);
    console.log(expected === "ERROR" ? "✅ PASS" : "❌ FAIL");
  }
}

const stack = new Stack();

// ===============================
// BASIC TESTS
// ===============================

runStackTest("Empty on start", () => stack.isEmpty(), true);

stack.push(10);
runStackTest("After push 10, isEmpty", () => stack.isEmpty(), false);
runStackTest("Pop 10", () => stack.pop(), 10);
runStackTest("Empty after pop", () => stack.isEmpty(), true);

// ===============================
// LIFO TEST
// ===============================

stack.push(1);
stack.push(2);
stack.push(3);

runStackTest("Pop should be 3", () => stack.pop(), 3);
runStackTest("Pop should be 2", () => stack.pop(), 2);
runStackTest("Pop should be 1", () => stack.pop(), 1);

// ===============================
// PEEK TEST
// ===============================

stack.push("A");
stack.push("B");

runStackTest("Peek should be B", () => stack.peek(), "B");
runStackTest("Pop should be B", () => stack.pop(), "B");
runStackTest("Pop should be A", () => stack.pop(), "A");

// ===============================
// peek(index)
// ===============================

stack.push(5);
stack.push(6);
stack.push(7);

runStackTest("peek(0)", () => stack.peek(0), 7);
runStackTest("peek(1)", () => stack.peek(1), 6);
runStackTest("peek(2)", () => stack.peek(2), 5);
runStackTest("peek(3) out of bounds", () => stack.peek(3), "ERROR");

// ===============================
// UNDERFLOW TESTS
// ===============================

stack.pop();
stack.pop();
stack.pop();

runStackTest("Pop on empty", () => stack.pop(), "ERROR");
runStackTest("Peek on empty", () => stack.peek(), "ERROR");

// ===============================
// CLEAR TEST
// ===============================

stack.push(5);
stack.push(6);
stack.push(7);
stack.clear();

runStackTest("Size after clear", () => stack.size(), 0);

// ===============================
// MIXED DATA TYPES
// ===============================

stack.push(1);
stack.push("two");
stack.push({ x: 3 });

runStackTest("Size should be 3", () => stack.size(), 3);
runStackTest(
  "Pop object",
  () => stack.pop(),
  (res) => res.x === 3,
);
runStackTest("Pop string", () => stack.pop(), "two");
runStackTest("Pop number", () => stack.pop(), 1);

// ===============================
// INTERLEAVED OPERATIONS
// ===============================

stack.push(100);
stack.push(200);
stack.pop();
stack.push(300);

runStackTest("Pop should be 300", () => stack.pop(), 300);
runStackTest("Pop should be 100", () => stack.pop(), 100);

// ===============================
// LARGE VOLUME TEST
// ===============================

for (let i = 0; i < 1000; i++) {
  stack.push(i);
}

runStackTest(
  "Large volume test",
  () => {
    for (let i = 999; i >= 0; i--) {
      if (stack.pop() !== i) return false;
    }
    return true;
  },
  true,
);

console.log("===== STACK TESTS END =====");
