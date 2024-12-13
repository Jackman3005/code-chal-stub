import { createTRPCRouter, quickliAdminProcedure } from "~/server/api/trpc";

export const adminRouter = createTRPCRouter({
  getActiveUsers: quickliAdminProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const usersWithActiveSessions = await ctx.db.user.findMany({
      // orderBy: { createdAt: "desc" }, // Order by lastSeenAt once implemented
      where: { sessions: { some: { expires: { gt: now } } } },
      select: {
        id: true,
        email: true,
        name: true,
        sessions: {
          select: {
            id: true,
            expires: true,
            ipAddress: true,
            lastSeenAt: true
          },
          where: { expires: { gt: now } },
        },
      },
    });

    return usersWithActiveSessions
      .map((user) => {
        let rating = 0;

        // This is a bit of the "magic"
        // of determining the thresholds that punish bad behavior,
        // inform users with borderline behavior but avoid false positives...

        const activeSessionCount = user.sessions.length;
        const uniqueIpAddresses = user.sessions.reduce((acc, session) => {
          if (session.ipAddress === null) {
            return acc;
          }
          if (!acc.includes(session.ipAddress)) {
            acc.push(session.ipAddress);
          }
          return acc;
        }, [] as string[]);

        // TODO: Incorporate lastSeenAt into the rating calculation
        //  to penalize users who are active on more than one session at a time.

        rating += Math.max(0, activeSessionCount - 1);
        rating += Math.max(0, uniqueIpAddresses.length - 1);

        return { ...user, abuseRating: rating };
      })
      .sort((a, b) =>
        a.abuseRating === b.abuseRating
          ? 0
          : a.abuseRating > b.abuseRating
            ? -1
            : 1,
      );
  }),
});
