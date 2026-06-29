import { createFileRoute } from "@tanstack/react-router";
import { LoginLogsPage } from "@/features/login-logs";

export const Route = createFileRoute("/_authenticated/users/logs")({
    component: LoginLogsPage,
}); 