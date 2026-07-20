import type { HydratedDocument } from "mongoose";
import type { IUser } from "../models/userModel.js";

/**
 * `auth` middleware attaches the authenticated user to the request. Declaring
 * it here means every downstream handler sees `req.user` as a real typed
 * document instead of `any`, so a typo like `req.user.emial` fails to compile.
 *
 * It is optional because the same Request type is used on public routes, where
 * the middleware has not run.
 */
declare global {
  namespace Express {
    interface Request {
      user?: HydratedDocument<IUser>;
    }
  }
}

export {};
