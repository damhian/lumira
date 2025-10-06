export default function UnsubscribedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-600 to-indigo-300 py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white p-8 rounded shadow text-center">
        <h1 className="text-2xl text-gray-700 font-bold mb-4">
          You’ve been unsubscribed
        </h1>
        <p className="text-gray-600">
          You will no longer receive Lamira newsletters. You can re‑activate
          anytime from your dashboard.
        </p>
      </div>
    </div>
  );
}
