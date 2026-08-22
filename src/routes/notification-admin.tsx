import { createFileRoute } from "@tanstack/react-router";
import NotificationAdmin from "@/pages/NotificationAdmin";

export const Route = createFileRoute("/notification-admin")({
  component: NotificationAdmin,
});
