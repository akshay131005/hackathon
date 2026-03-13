import rateLimit from "express-rate-limit";

export const issueLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30
});

export const verifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60
});

