import { createFileRoute } from "@tanstack/react-router";
import Communicon from "@/pages/Communicon";

export const Route = createFileRoute("/communicon")({
  component: Communicon,
});
