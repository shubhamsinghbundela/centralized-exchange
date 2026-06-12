import type { NextFunction, Request, RequestHandler, Response } from "express";

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return function wrappedHandler(req, res, next) {
    void handler(req, res, next).catch(next);
  };
}
