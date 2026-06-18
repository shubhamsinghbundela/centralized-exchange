import { describe, expect, test } from "bun:test";
import request from "supertest";

import { app } from "../src/index";

describe("Signup API", () => {
  test("should create user", async () => {
    const response = await request(app)
      .post("/signup")
      .send({
        username: `shubham-${Date.now()}`,
        password: "password123",
      });

    expect(response.status).toBe(201);

    expect(response.body).toHaveProperty("token");

    expect(response.body).toHaveProperty("userId");

    expect(response.body.username).toContain("shubham");
  });

  test("should reject duplicate username", async () => {
    const username = `user-${Date.now()}`;

    await request(app).post("/signup").send({
      username,
      password: "password123",
    });

    const response = await request(app).post("/signup").send({
      username,
      password: "password123",
    });

    expect(response.status).toBe(409);

    expect(response.body.error).toBe("username already exists");
  });

  test("should reject invalid request", async () => {
    const response = await request(app).post("/signup").send({
      username: "",
      password: "",
    });

    expect(response.status).toBe(400);
  });
});

describe("Signin API", () => {
  test("should signin successfully", async () => {
    const username = `user-${Date.now()}`;

    // Create user
    await request(app).post("/signup").send({
      username,
      password: "password123",
    });

    // Sign in
    const response = await request(app).post("/signin").send({
      username,
      password: "password123",
    });

    expect(response.status).toBe(201);

    expect(response.body).toHaveProperty("token");

    expect(response.body).toHaveProperty("userId");

    expect(response.body.username).toBe(username);
  });

  test("should return 401 if username does not exist", async () => {
    const response = await request(app).post("/signin").send({
      username: "unknown-user",
      password: "password123",
    });

    expect(response.status).toBe(401);

    expect(response.body.error).toBe("username not exists");
  });

  test("should return 403 for incorrect password", async () => {
    const username = `user-${Date.now()}`;

    // Create user
    await request(app).post("/signup").send({
      username,
      password: "password123",
    });

    // Wrong password
    const response = await request(app).post("/signin").send({
      username,
      password: "wrong-password",
    });

    expect(response.status).toBe(403);

    expect(response.body.error).toBe("password is invalid");
  });

  test("should return 400 for invalid body", async () => {
    const response = await request(app).post("/signin").send({
      username: "",
      password: "",
    });

    expect(response.status).toBe(400);
  });
});
