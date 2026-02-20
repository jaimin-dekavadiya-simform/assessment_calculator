import Stack from "../utils/stack.js";
console.log("===== STACK TESTS START =====");

const stack = new Stack();

// 1️⃣ New stack should be empty
console.log("Empty on start:", stack.isEmpty()); // true

// 2️⃣ Push & Pop single item
stack.push(10);
console.log("After push 10, isEmpty:", stack.isEmpty()); // false
console.log("Pop:", stack.pop()); // 10
console.log("Empty after pop:", stack.isEmpty()); // true

// 3️⃣ LIFO order
stack.push(1);
stack.push(2);
stack.push(3);
console.log("Pop should be 3:", stack.pop());
console.log("Pop should be 2:", stack.pop());
console.log("Pop should be 1:", stack.pop());

// 4️⃣ Peek top element
stack.push("A");
stack.push("B");
console.log("Peek should be B:", stack.peek());
console.log("Pop should still be B:", stack.pop());
console.log("Pop should be A:", stack.pop());

// 5️⃣ peek(index)
stack.push(5);
stack.push(6);
stack.push(7); // top

console.log("peek(0) should be 7:", stack.peek(0));
console.log("peek(1) should be 6:", stack.peek(1));
console.log("peek(2) should be 5:", stack.peek(2));

// 6️⃣ peek(index) out of bounds
try {
  console.log(stack.peek(3));
} catch (e) {
  console.log("peek out of bounds error:", e.message);
}

// 7️⃣ Underflow pop
stack.pop();
stack.pop();
stack.pop();

try {
  stack.pop();
} catch (e) {
  console.log("Pop on empty error:", e.message);
}

// 8️⃣ Underflow peek
try {
  stack.peek();
} catch (e) {
  console.log("Peek on empty error:", e.message);
}
// Clear Test
stack.push(5);
stack.push(6);
stack.push(7);
stack.clear();
console.log("size after clear shoud be 0:", stack.size());

// 9️⃣ Mixed data types
stack.push(1);
stack.push("two");
stack.push({ x: 3 });
console.log("Size should be 3 :", stack.size());
console.log("Pop object:", stack.pop());
console.log("Pop string:", stack.pop());
console.log("Pop number:", stack.pop());

// 🔟 Interleaved operations
stack.push(100);
stack.push(200);
stack.pop();
stack.push(300);

console.log("Pop should be 300:", stack.pop());
console.log("Pop should be 100:", stack.pop());

// 1️⃣1️⃣ Large volume test
for (let i = 0; i < 1000; i++) {
  stack.push(i);
}

let correct = true;
for (let i = 999; i >= 0; i--) {
  if (stack.pop() !== i) {
    correct = false;
    break;
  }
}

console.log("Large volume test passed:", correct);

console.log("===== STACK TESTS END =====");
