import { describe, expect, test } from "bun:test";
import request from "supertest";
import { app } from "../src/index.js";

describe("Deposit API", () => {
  test("should deposit money", async () => {
    const username = `user-${Date.now()}`;

    // Create user
    const signupResponse = await request(app).post("/signup").send({
      username,
      password: "password123",
    });

    expect(signupResponse.status).toBe(201);

    const token = signupResponse.body.token;

    // Deposit
    const depositResponse = await request(app)
      .post("/deposit")
      .set("Authorization", `Bearer ${token}`)
      .send({
        asset: "USD",
        amount: "1000",
      });

    expect(depositResponse.status).toBe(200);

    expect(depositResponse.body).toEqual({
      userId: signupResponse.body.userId,
      asset: "USD",
      balance: {
        available: "1000",
        locked: "0",
      },
    });
  });

  test("should accumulate deposits", async () => {
    const username = `user-${Date.now()}`;

    const signupResponse = await request(app).post("/signup").send({
      username,
      password: "password123",
    });

    const token = signupResponse.body.token;

    await request(app)
      .post("/deposit")
      .set("Authorization", `Bearer ${token}`)
      .send({
        asset: "USD",
        amount: "1000",
      });

    const response = await request(app)
      .post("/deposit")
      .set("Authorization", `Bearer ${token}`)
      .send({
        asset: "USD",
        amount: "500",
      });

    expect(response.status).toBe(200);

    expect(response.body.balance).toEqual({
      available: "1500",
      locked: "0",
    });
  });

  test("should reject invalid request", async () => {
    const username = `user-${Date.now()}`;

    const signupResponse = await request(app).post("/signup").send({
      username,
      password: "password123",
    });

    const token = signupResponse.body.token;

    const response = await request(app)
      .post("/deposit")
      .set("Authorization", `Bearer ${token}`)
      .send({
        asset: "",
        amount: "-100",
      });

    expect(response.status).toBe(400);
  });

  test("should reject unauthenticated requests", async () => {
    const response = await request(app).post("/deposit").send({
      asset: "USD",
      amount: "1000",
    });

    expect(response.status).toBe(401);
  });
});
