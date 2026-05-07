import { createApi } from "@convex-dev/better-auth";
import { organization } from "better-auth/plugins";
import { convexAdapter } from "@convex-dev/better-auth";
import schema from "./schema";

export const { create, findOne, findMany, updateOne, updateMany, deleteOne, deleteMany } =
  createApi(schema, () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    database: convexAdapter({} as any, {} as any),
    plugins: [organization()],
  }));
