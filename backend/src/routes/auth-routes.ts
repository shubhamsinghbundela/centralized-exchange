import { Router } from "express";
import { signin, signup } from "../controllers/auth-controller.js";
import { asyncHandler } from "../utils/async-handler.js";

export const authRouter = Router();

authRouter.post("/signup", asyncHandler(signup));
authRouter.post("/signin", asyncHandler(signin));
