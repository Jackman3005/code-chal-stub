import { PrismaAdapter } from "@auth/prisma-adapter";
import { type AuthOptions, type DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import type { NextApiRequest, NextApiResponse } from "next";
import NextAuth from "next-auth";
import { randomUUID } from "crypto";
import { db } from "~/server/db";
import {getClientIp} from "request-ip";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

const PREPEND_COOKIENAME = process.env.VERCEL ? "__Secure-" : "";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig: AuthOptions = {
  providers: [
    CredentialsProvider({
      // The name to display on the sign in form (e.g. 'Sign in with...')
      name: "Credentials",
      // The credentials is used to generate a suitable form on the sign in page.
      // You can specify whatever fields you are expecting to be submitted.
      // e.g. domain, username, password, 2FA token, etc.
      // You can pass any HTML attribute to the <input> tag through the object.
      credentials: {
        email: { label: "Email", type: "email", placeholder: "jsmith@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(_credentials, _req) {
        const credentialsParseResult = credentialsSchema.safeParse(_credentials);

        if (!credentialsParseResult.success) {
          return null;
        }

        const credentials = credentialsParseResult.data;


        // You need to provide your own logic here that takes the credentials
        // submitted and returns either a object representing a user or value
        // that is false/null if the credentials are invalid.
        // e.g. return { id: 1, name: 'J Smith', email: 'jsmith@example.com' }
        // You can also use the `req` object to obtain additional parameters
        // (i.e., the request IP address)
        const user = await db.user.findFirst({
          where: {
            email: credentials.email,
          },
        });

        if (user) {
          console.debug(
            "Found existing user:",
            user,
            "\nCredentials provided:",
            credentials,
          );

          if (user.password !== credentials.password) {
            console.warn("Incorrect password provided, authorization failed.");
            return null;
          }

          return user;
        } else {
          console.debug(
            "No existing user found. Creating new user from credentials:",
            credentials,
          );
          return db.user.create({
            data: {
              email: credentials.email,
              password: credentials.password,
            },
          });
        }
      },
    }),
  ],
  adapter: PrismaAdapter(db),

  callbacks: {
    session: ({ session, user }) => {
      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
        },
      };
    },
  },

  jwt: {},
} satisfies AuthOptions;

const SESSION_EXPIRY_HOURS = 24 * 7;

export async function authHandler(req: NextApiRequest, res: NextApiResponse) {
  // Do whatever you want here, before the request is passed down to `NextAuth`

  const clientIp = getClientIp(req);
  console.log("config:129 - clientIp", clientIp);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return await NextAuth(
    // @ts-expect-error expecting NextRequest for some reason
    req,
    res,
    {
      ...authConfig,
      callbacks: {
        ...authConfig.callbacks,
        async signIn({
          user,
          //account, profile, email, credentials
        }) {
          // Check if this sign in callback is being called in the credentials authentication flow. If so, use the next-auth adapter to create a session entry in the database (SignIn is called after authorize so we can safely assume the user is valid and already authenticated).
          if (
            req.query?.nextauth?.includes("callback") &&
            req.query.nextauth.includes("credentials") &&
            req.method === "POST"
          ) {
            if (user) {
              const sessionToken = randomUUID();
              const sessionExpiry = new Date();
              sessionExpiry.setHours(sessionExpiry.getHours() + SESSION_EXPIRY_HOURS);

              await db.session.create({
                data: {
                  sessionToken: sessionToken,
                  userId: user.id,
                  expires: sessionExpiry,
                  ipAddress: clientIp,
                },
              });

              res.setHeader(
                "Set-Cookie",
                `${PREPEND_COOKIENAME}next-auth.session-token=${sessionToken}; ` +
                  `Path=/; ` +
                  `Max-Age=${Math.round(60 * 60 * SESSION_EXPIRY_HOURS)}; ` +
                  `HttpOnly; ` +
                  `Secure; ` +
                  `SameSite=Lax; `,
              );
            }
          }

          return true;
        },
      },
      jwt: {
        // Customize the JWT encode and decode functions to overwrite the default behaviour of storing the JWT token in the session cookie when using credentials providers. Instead we will store the session token reference to the session in the database.
        encode: async ({ token, secret, maxAge }) => {
          if (
            req.query?.nextauth?.includes("callback") &&
            req.query.nextauth.includes("credentials") &&
            req.method === "POST"
          ) {
            return (
              req.cookies[`${PREPEND_COOKIENAME}next-auth.session-token`] ?? ""
            );
          }
          // Revert to default behaviour when not in the credentials provider callback flow
          return authConfig.jwt?.encode?.({ token, secret, maxAge });
        },
        decode: async ({ token, secret }) => {
          if (
            req.query?.nextauth?.includes("callback") &&
            req.query.nextauth.includes("credentials") &&
            req.method === "POST"
          ) {
            return null;
          }

          // Revert to default behaviour when not in the credentials provider callback flow
          return authConfig.jwt?.decode?.({ token, secret });
        },
      },
    },
  );
}
