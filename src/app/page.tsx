import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="mb-3 text-sm text-mute">Account Ops</p>
      <h1 className="font-display text-3xl font-semibold text-parch sm:text-4xl">
        Internal account creation tracker
      </h1>
      <p className="mt-3 max-w-sm text-mute">
        Workers use the link they were sent. Admins sign in below.
      </p>
      <Link href="/admin/login" className="btn-primary mt-8">
        Admin sign in
      </Link>
    </main>
  );
}
