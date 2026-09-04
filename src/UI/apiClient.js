// Thin JSON client for the calculator's HTTP arithmetic API.
//
// POST /api/v1/calculate performs a single binary operation server-side:
//   Request : JSON { operation: "add"|"subtract"|"multiply"|"divide",
//                    a: <finite number>, b: <finite number> }
//   Success : 200 { operation, a, b, result }
//   Errors  : 400 { error: "<message>" } (plus the server-wide 405/413
//             conventions documented in docs/adr/0002-calculate-endpoint.md)
//
// requestCalculation resolves with the numeric `result` on success and
// rejects with an Error carrying the server's error message otherwise.

/**
 * Perform one binary arithmetic operation through POST /api/v1/calculate.
 *
 * @param {string} operation "add" | "subtract" | "multiply" | "divide"
 * @param {number} a first operand (finite number)
 * @param {number} b second operand (finite number)
 * @returns {Promise<number>} the numeric result
 * @throws {Error} with the server's error message when the API responds with
 *   an error, or a descriptive message when the response/network is broken.
 */
export async function requestCalculation(operation, a, b) {
  let response;
  try {
    response = await fetch('/api/v1/calculate', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation, a, b }),
    });
  } catch (cause) {
    // fetch() itself rejected: server unreachable, CORS failure, offline...
    const error = new Error("Unable to reach the calculation service");
    error.cause = cause;
    throw error;
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    // Body was not JSON.
    throw new Error(
      response.ok
        ? "Calculation service returned an invalid response"
        : `Calculation request failed (HTTP ${response.status})`,
    );
  }

  if (!response.ok) {
    // Error responses keep the server's {"error": "<message>"} shape
    // (docs/adr/0002-calculate-endpoint.md); surface that message.
    const message =
      payload !== null &&
      typeof payload === "object" &&
      typeof payload.error === "string"
        ? payload.error
        : `Calculation request failed (HTTP ${response.status})`;
    throw new Error(message);
  }

  if (
    payload === null ||
    typeof payload !== "object" ||
    typeof payload.result !== "number"
  ) {
    throw new Error("Calculation service returned an invalid response");
  }

  return payload.result;
}

export default requestCalculation;
