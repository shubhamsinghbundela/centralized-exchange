import http from "k6/http";
import TOKENS from "./token.js";

const BASE_URL = "http://localhost:3000";

export function setup() {
  for (const token of TOKENS) {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    http.post(
      `${BASE_URL}/deposit`,
      JSON.stringify({
        asset: "USD",
        amount: 1000000,
      }),
      { headers },
    );

    http.post(
      `${BASE_URL}/deposit`,
      JSON.stringify({
        asset: "BTC",
        amount: 1000,
      }),
      { headers },
    );
  }
}

export default function () {}
