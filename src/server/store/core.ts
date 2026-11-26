import { randomBytes, randomUUID } from "node:crypto";
import type { Db } from "../db/client";

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type Q = Db | Tx;

export type Role = "owner" | "staff";

/** Signed-in staff member acting on their own store. Every store call filters by `orgId`. */
export interface Ctx {
  db: Db;
  orgId: string;
  userId: string;
  role: Role;
}

/** An error the user should see, with its HTTP status. */
export class StoreError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export function requireOwner(ctx: Ctx): void {
  if (ctx.role !== "owner") throw new StoreError("Only the owner can do this", 403);
}

export const newId = (): string => randomUUID();

/** 128-bit random URL-safe token for QR codes and share links. */
export const newToken = (): string => randomBytes(16).toString("base64url");

export const ms = (d: Date | null | undefined): number => (d ? d.getTime() : 0);
