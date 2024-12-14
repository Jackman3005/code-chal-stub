import { createTRPCRouter, quickliAdminProcedure } from "~/server/api/trpc";

export const adminRouter = createTRPCRouter({
  getActiveUsers: quickliAdminProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const users = await ctx.db.user.findMany({
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
          },
          where: { expires: { gt: now } },
        },
      },
    });

    return users.map((user) =>{
      let rating = 0;

      // This is a bit of the "magic"
      // of determining the thresholds that punish bad behavior,
      // inform users with borderline behavior but avoid false positives...

      const sessionCount = user.sessions.length;
      const uniqueIpAddresses = user.sessions.reduce((acc, session) => {
        if (session.ipAddress === null){
          return acc;
        }
        if (!acc.includes(session.ipAddress)){
          acc.push(session.ipAddress);
        }
        return acc;
      }, [] as string[]);

      rating += Math.max(0, sessionCount - 1);
      rating += Math.max(0, uniqueIpAddresses.length - 1);


      return {...user, abuseRating:rating}
    });
  }),
});
