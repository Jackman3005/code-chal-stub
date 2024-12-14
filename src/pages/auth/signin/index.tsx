import { type NextPage } from "next";
import Head from "next/head";

const SigninPage: NextPage = (props) => {
  console.log("signin:18 - Received Props", props);
  const [state, formAction] = useFormState(signInEmail, null);

  return (
    <>
      <Head>
        <title>Signin to Quickli</title>
        <meta name="description" content="Quickli signin page" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="min-h-screen bg-gradient-to-b from-[#2e026d] to-[#15162c] p-8">
        <div className="mx-auto max-w-6xl">
          <form action={formAction}>
            <label>
              E-mail address:
              <input type="email" name="email" />
            </label>
            <button type="submit">Sign in with email</button>
            {state?.status === "error" && (
              <p>{state.errorMessage}</p>
            )}
          </form>
        </div>
      </main>
    </>
  );
};

export default SigninPage;
