import { notFound } from "next/navigation";
import { StoreError } from "./store/core";

/** Await a store call for a page; a 404 StoreError renders the not-found page. */
export async function orNotFound<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof StoreError && e.status === 404) notFound();
    throw e;
  }
}
