import http from "k6/http";
import { sleep } from "k6";
import TOKENS from "./token.js";

const BASE_URL = "http://localhost:3000";
function getHeaders() {
  const token = TOKENS[(__VU - 1) % TOKENS.length];

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export const options = {
  scenarios: {
    makers: {
      executor: "constant-vus",
      vus: 30,
      duration: "1m",
      exec: "makers",
    },

    takers: {
      executor: "constant-vus",
      vus: 30,
      duration: "1m",
      exec: "takers",
    },

    depthReaders: {
      executor: "constant-vus",
      vus: 40,
      duration: "1m",
      exec: "depthReaders",
    },
  },
};

export function makers() {
  const headers = getHeaders();

  const side = Math.random() > 0.5 ? "buy" : "sell";

  const price = side === "buy" ? 99 + Math.random() : 101 + Math.random();

  http.post(
    `${BASE_URL}/order`,
    JSON.stringify({
      type: "limit",
      side,
      symbol: "BTC",
      price,
      qty: 1,
    }),
    { headers },
  );

  sleep(0.2);
}

export function takers() {
  const headers = getHeaders();

  const side = Math.random() > 0.5 ? "buy" : "sell";

  http.post(
    `${BASE_URL}/order`,
    JSON.stringify({
      type: "market",
      side,
      symbol: "BTC",
      qty: 1,
    }),
    { headers },
  );

  sleep(0.2);
}

export function depthReaders() {
  const headers = getHeaders();

  http.get(`${BASE_URL}/depth/BTC`, { headers });

  sleep(0.1);
}

// export default function () {
//   // required by k6
// }
