import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { ZodType } from "zod";
import { AppError } from "../utils/AppError.js";

type Source = "body" | "query" | "params";

/**
 * Validates `req[source]` against a Zod schema and replaces it with the parsed
 * result. Because Zod strips unknown keys, this doubles as the field allowlist
 * that keeps clients from writing to fields they shouldn't (rating, role, ...).
 *
 * The handler downstream still sees `req.body` as Express types it, so route
 * handlers cast to the schema's inferred type where they need the narrowed
 * shape — see the `Validated<T>` helper below.
 */
export const validate =
  (schema: ZodType, source: Source = "body"): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const details = result.error.issues.map(
        (i) => `${i.path.join(".") || source}: ${i.message}`
      );
      return next(new AppError("Validation failed", 400, details));
    }

    // Express 5 exposes req.query as a getter-only property, so a plain
    // assignment throws. Redefine it instead; req.body and req.params are
    // ordinary writable properties.
    if (source === "query") {
      Object.defineProperty(req, "query", {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } else {
      (req as unknown as Record<Source, unknown>)[source] = result.data;
    }

    next();
  };

/**
 * Request whose body/query/params have been through `validate`.
 * Used at the top of a handler to recover the schema's inferred type:
 *
 *   const { title } = req.body as CreateEventInput;
 */
export type Validated<TBody = unknown, TQuery = unknown, TParams = unknown> =
  Request & {
    body: TBody;
    query: TQuery;
    params: TParams;
  };
