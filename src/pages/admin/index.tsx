import { type NextPage } from "next";
import Head from "next/head";
import { api } from "~/utils/api";

import {
  getKeyValue,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@nextui-org/table";

const columns = [
  {
    key: "user",
    label: "USER",
  },
  {
    key: "abuseRating",
    label: "ABUSE RATING",
    allowsSorting: true,
  },
  {
    key: "sessionCount",
    label: "SESSION COUNT",
    allowsSorting: true,
  },
  {
    key: "ipAddresses",
    label: "UNIQUE IP ADDRESSES",
    allowsSorting: true,
  },
  {
    key: "userId",
    label: "USER ID",
  },
];

const AdminDashboardPage: NextPage = () => {
  const {
    data: users,
    isLoading,
    error,
  } = api.admin.getActiveUsers.useQuery(undefined, {
    retry: (failureCount, error) => {
      // Do not retry if the user is not authorized.
      return error.data?.httpStatus !== 401 && failureCount < 3;
    },
  });

  if (error) {
    // TODO: Make this a bit nicer.
    //  Can handle 401 s explicitly
    //  to show an error screen with countdown
    //  and redirect them back to home page.
    //  Could consider logging them out and redirecting to login, etc.

    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-red-500">Error: {error.message}</p>
      </div>
    );
  } else if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-white">Loading...</p>
      </div>
    );
  }

  const rows = users?.map((user) => ({
    key: user.id,
    user: user.name ?? user.email,
    abuseRating: user.abuseRating,
    sessionCount: user.sessions.length,
    ipAddresses: user.sessions
      .map((session) => session.ipAddress)
      .filter((ip) => ip !== null)
      .filter((ip, index, arr) => arr.indexOf(ip) === index).length,
    userId: user.id,
  }));

  return (
    <>
      <Head>
        <title>Quickli Active Users</title>
        <meta name="description" content="View and manage Quickli users" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="min-h-screen bg-gradient-to-b from-[#2e026d] to-[#15162c] p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-4xl font-bold text-white">Users</h1>
          </div>

          {!rows || rows.length === 0 ? (
            <div className="mt-8 text-center">
              {/*
              This situation should not happen.
              The admin user requesting info should always be included at minimum.
              */}
              <p className="text-lg text-white">No active users found</p>
            </div>
          ) : (
            <Table aria-label="Active User List">
              <TableHeader columns={columns}>
                {(column) => (
                  <TableColumn key={column.key}>{column.label}</TableColumn>
                )}
              </TableHeader>
              <TableBody items={rows}>
                {(item) => (
                  <TableRow key={item.key}>
                    {(columnKey) => (
                      <TableCell>{getKeyValue(item, columnKey)}</TableCell>
                    )}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}

          {/*<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">*/}
          {/* */}
          {/* */}
          {/*  {users?.map((user) => (*/}
          {/*    // <Link*/}
          {/*    //   key={user.id}*/}
          {/*    //   href={`/admin/users/${user.id}`}*/}
          {/*    //   className="transition-transform hover:scale-105"*/}
          {/*    // >*/}
          {/*      <Card key={user.id} className="transition-transform hover:scale-105">*/}
          {/*        <CardHeader>*/}
          {/*          <CardTitle>{user.name ?? "Unnamed User"} ({user.email})</CardTitle>*/}
          {/*        </CardHeader>*/}
          {/*        <CardContent>*/}
          {/*            <p className="mb-4 text-gray-600">*/}
          {/*              Active Sessions: {user.sessions.length}*/}
          {/*            </p>*/}
          {/*          <p className="text-sm text-gray-400">*/}
          {/*            User ID: {user.id}*/}
          {/*          </p>*/}
          {/*        </CardContent>*/}
          {/*      </Card>*/}
          {/*    // </Link>*/}
          {/*  ))}*/}
          {/*</div>*/}
        </div>
      </main>
    </>
  );
};

export default AdminDashboardPage;
