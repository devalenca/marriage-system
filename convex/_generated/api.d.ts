/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as access from "../access.js";
import type * as attachments from "../attachments.js";
import type * as auth from "../auth.js";
import type * as dashboard from "../dashboard.js";
import type * as feedback from "../feedback.js";
import type * as finance from "../finance.js";
import type * as guests from "../guests.js";
import type * as http from "../http.js";
import type * as inspiration from "../inspiration.js";
import type * as lib_accounts from "../lib/accounts.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_db from "../lib/db.js";
import type * as lib_userCreation from "../lib/userCreation.js";
import type * as lib_validators from "../lib/validators.js";
import type * as migrations from "../migrations.js";
import type * as payments from "../payments.js";
import type * as tasks from "../tasks.js";
import type * as users from "../users.js";
import type * as vendors from "../vendors.js";
import type * as verses from "../verses.js";
import type * as weddings from "../weddings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  access: typeof access;
  attachments: typeof attachments;
  auth: typeof auth;
  dashboard: typeof dashboard;
  feedback: typeof feedback;
  finance: typeof finance;
  guests: typeof guests;
  http: typeof http;
  inspiration: typeof inspiration;
  "lib/accounts": typeof lib_accounts;
  "lib/auth": typeof lib_auth;
  "lib/db": typeof lib_db;
  "lib/userCreation": typeof lib_userCreation;
  "lib/validators": typeof lib_validators;
  migrations: typeof migrations;
  payments: typeof payments;
  tasks: typeof tasks;
  users: typeof users;
  vendors: typeof vendors;
  verses: typeof verses;
  weddings: typeof weddings;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
