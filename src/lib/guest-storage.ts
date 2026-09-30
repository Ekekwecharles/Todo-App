export type GuestTask = {
  id: string;
  title: string;
  category: string;
  priority: string;
  dueDate: string | null;
  completed: boolean;
  description: string;
};

export type GuestNote = {
  id: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  updatedAt: string;
};

export type GuestWorkspace = {
  tasks: GuestTask[];
  notes: GuestNote[];
};

const STORAGE_KEY = "daybook-guest-workspace-v1";
export const WORKSPACE_MODE_KEY = "daybook-workspace-mode";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTask(value: unknown): value is GuestTask {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.category === "string" &&
    typeof value.priority === "string" &&
    (typeof value.dueDate === "string" || value.dueDate === null) &&
    typeof value.completed === "boolean" &&
    typeof value.description === "string"
  );
}

function isNote(value: unknown): value is GuestNote {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.content === "string" &&
    typeof value.color === "string" &&
    typeof value.pinned === "boolean" &&
    typeof value.updatedAt === "string"
  );
}

export function readGuestWorkspace(): GuestWorkspace {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    throw new Error(
      "Browser storage is unavailable. Your guest data cannot be opened.",
    );
  }

  if (!raw) return { tasks: [], notes: [] };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      parsed.version !== 1 ||
      !Array.isArray(parsed.tasks) ||
      !Array.isArray(parsed.notes)
    ) {
      throw new Error("This saved guest workspace has an unsupported format.");
    }

    return {
      tasks: parsed.tasks.filter(isTask),
      notes: parsed.notes.filter(isNote),
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("This saved guest")
    ) {
      throw error;
    }
    throw new Error(
      "Your saved guest workspace could not be read. The data was left untouched.",
    );
  }
}

export function writeGuestWorkspace(workspace: GuestWorkspace) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, ...workspace }),
    );
  } catch {
    throw new Error(
      "Browser storage is full or unavailable. Your change was not saved.",
    );
  }
}
