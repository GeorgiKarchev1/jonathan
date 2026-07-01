// Redirect agents page to chat — I'm the only agent here.
import { redirect } from "next/navigation";

export default function AgentsPage() {
  redirect("/chat");
}
