async function runTest() {
  console.log("Running tests!");
  await import("./stackTest.js");
  console.log("All test completed");
}
runTest();
