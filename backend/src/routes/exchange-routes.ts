import { Router } from "express";
import {
  cancelOrder,
  createOrder,
  getBalance,
  getDepth,
  getOrder,
} from "../controllers/exchange-controller.js";
import { requireAuth } from "../utils/auth.js";
import { asyncHandler } from "../utils/async-handler.js";

export const exchangeRouter = Router();

exchangeRouter.post("/order", requireAuth, asyncHandler(createOrder));
exchangeRouter.get("/depth/:symbol", requireAuth, asyncHandler(getDepth));
exchangeRouter.get("/balance", requireAuth, asyncHandler(getBalance));
exchangeRouter.get("/order/:orderId", requireAuth, asyncHandler(getOrder));
exchangeRouter.delete("/order/:orderId", requireAuth, asyncHandler(cancelOrder));
