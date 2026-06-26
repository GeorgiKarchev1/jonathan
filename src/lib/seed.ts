import type { AppData } from "./types";

// Empty starting state. Only the owner account exists; everything else
// begins blank. Feature requests and feedback fill in over time.
export function buildSeed(): AppData {
  const users: AppData["users"] = [
    { id: "u_ivan", name: "Георги Карчев", email: "georgikarchev5@gmail.com", role: "owner", color: "#8b5cf6", title: "Собственик" },
  ];

  return {
    users,
    companies: [],
    projects: [],
    tasks: [],
    attachments: [],
    folders: [],
    agents: [],
    boardColumns: [],
    conversations: [],
    feedback: [],
    currentUserId: "u_ivan",
  };
}
