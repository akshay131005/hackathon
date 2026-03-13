import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "change-me";

export interface AuthPayload {
  issuerId: string;
  role: "issuer" | "admin";
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthPayload;
}

export function requireIssuerAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    if (payload.role !== "issuer" && payload.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    req.auth = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

