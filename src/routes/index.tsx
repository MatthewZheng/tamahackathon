import { createFileRoute } from "@tanstack/react-router";
import { TamaApp } from "@/components/tama/TamaApp";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return <TamaApp />;
}
