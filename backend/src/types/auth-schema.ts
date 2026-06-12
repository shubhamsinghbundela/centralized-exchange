import { z } from "zod";

export const authSchema = z.object({
  username: z.string().trim().min(1, "username is required"),
  password: z.string().min(1, "password is required"),
});
