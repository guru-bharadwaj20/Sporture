import { AppError } from "../utils/AppError.js";

/**
 * Validates `req[source]` against a Zod schema and replaces it with the parsed
 * result. Because Zod strips unknown keys, this doubles as the field allowlist
 * that keeps clients from writing to fields they shouldn't (rating, eventsHosted, ...).
 */
export const validate = (schema, source = "body") => (req, res, next) => {
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
    req[source] = result.data;
  }

  next();
};
