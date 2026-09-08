import { Link } from "react-router-dom";

export function NotFound({ what }: { what?: string }) {
  return (
    <div className="mx-auto max-w-lg px-5 py-24 text-center">
      <h1 className="text-xl font-semibold text-slate-200">Nothing here</h1>
      <p className="mt-2 text-sm text-slate-500">
        {what ? (
          <>
            No drill with id <code className="text-slate-400">{what}</code>.
          </>
        ) : (
          "That route doesn't exist."
        )}
      </p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-500"
      >
        ← Back to the catalog
      </Link>
    </div>
  );
}
