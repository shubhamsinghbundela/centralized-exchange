import http from "k6/http";
import TOKENS from "./token.js";
import { check } from "k6";

const BASE_URL = "http://localhost:3000";

//Seeding balances (Not Doing LoadTesting here)
export function setup() {
  for (const token of TOKENS) {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    const res = http.post(
      `${BASE_URL}/deposit`,
      JSON.stringify({
        asset: "USD",
        amount: "1000000",
      }),
      { headers },
    );

    // check(res, {
    //   "status is 200": (r) => r.status === 200,
    // });

    http.post(
      `${BASE_URL}/deposit`,
      JSON.stringify({
        asset: "BTC",
        amount: "1000",
      }),
      { headers },
    );
  }
}

// Understanding Metrics
// Iteration = One complete execution of the default function.
// VU = Virtual User (Concurrent users)
// http_req_duration..............: avg=189.16ms min=182.44ms med=186.33ms max=472.95ms p(90)=189.7ms p(95)=191.91ms
// avg: Average response time
// max: Slowest request
// min: Fastest request
// p90: 90% requests completed below this time.
// http_req_duration : API latency
// http_req_failed: failed requests %
export default function () {}

// What is check()?
// Without check k6 only knows Request was sent but It does NOT know whether response was correct.

// What is stdout?
// everything printed in terminal is called stdout.

// --quiet: k6 run --quiet test.js
// This hides: execution info, progress bar, test details
//But it does NOT hide warning/error logs.

// --log-output: k6 run --log-output=none test.js
// This controls where k6 sends logs.

//k6 run --quiet --log-output=none test.js: Only final summary
