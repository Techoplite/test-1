import Dashboard from "@/components/Dashboard";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const initialView = params.view === "copper" ? "copper" : "markets";
  return <Dashboard initialView={initialView} />;
}
