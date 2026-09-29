"use client";

import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock3,
  Feather,
  FileText,
  Flag,
  LayoutGrid,
  LogOut,
  Moon,
  Pin,
  Plus,
  Search,
  Sparkles,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

type Task = {
  id: string;
  title: string;
  category: string;
  priority: string;
  dueDate: string | null;
  completed: boolean;
  description: string;
};

type Note = {
  id: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  updatedAt: string;
};

type NoteDraft = {
  id: string | null;
  title: string;
  content: string;
  color: string;
};
type View = "today" | "upcoming" | "all" | "done" | "notes";
type Theme = "light" | "dark";

const categories = ["Personal", "Work", "Ideas", "Wellbeing"];
const priorities = ["low", "medium", "high"] as const;
const noteColors = ["butter", "sage", "rose", "lavender", "sky"];
const themeEvent = "daybook-theme-change";

const viewDetails: Record<
  Exclude<View, "notes">,
  { label: string; heading: string; subheading: string }
> = {
  today: {
    label: "Today",
    heading: "A little more present.",
    subheading: "A kind plan for the day ahead.",
  },
  upcoming: {
    label: "Upcoming",
    heading: "Room for what’s next.",
    subheading: "Your days, with a little more breathing room.",
  },
  all: {
    label: "All tasks",
    heading: "One thing at a time.",
    subheading: "Everything you’ve been meaning to do.",
  },
  done: {
    label: "Completed",
    heading: "Look how far you’ve come.",
    subheading: "The things you made time for.",
  },
};

function localDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}

function formatToday(value: Date) {
  return value.toLocaleDateString("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

async function responseError(response: Response) {
  const body = await response.json().catch(() => ({}));
  return typeof body.error === "string"
    ? body.error
    : "Something went wrong. Please try again.";
}

function subscribeToTheme(callback: () => void) {
  window.addEventListener(themeEvent, callback);
  return () => window.removeEventListener(themeEvent, callback);
}

function getStoredTheme(): Theme {
  return window.localStorage.getItem("daybook-theme") === "dark"
    ? "dark"
    : "light";
}

function storeTheme(theme: Theme) {
  window.localStorage.setItem("daybook-theme", theme);
  window.dispatchEvent(new Event(themeEvent));
}

export default function DaybookApp() {
  const [view, setView] = useState<View>("today");
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getStoredTheme,
    () => "light",
  );
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [protectedApp, setProtectedApp] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskCategory, setTaskCategory] = useState("Personal");
  const [taskPriority, setTaskPriority] =
    useState<(typeof priorities)[number]>("medium");
  const [taskDue, setTaskDue] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [noteDraft, setNoteDraft] = useState<NoteDraft | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const authResponse = await fetch("/api/auth", { cache: "no-store" });
      const auth = await authResponse.json();
      setProtectedApp(Boolean(auth.protected));
      setAuthorized(Boolean(auth.authenticated));
      if (!auth.authenticated) return;

      const [taskResponse, noteResponse] = await Promise.all([
        fetch("/api/tasks", { cache: "no-store" }),
        fetch("/api/notes", { cache: "no-store" }),
      ]);

      if (taskResponse.status === 401 || noteResponse.status === 401) {
        setAuthorized(false);
        return;
      }
      if (!taskResponse.ok) throw new Error(await responseError(taskResponse));
      if (!noteResponse.ok) throw new Error(await responseError(noteResponse));

      const [taskData, noteData] = await Promise.all([
        taskResponse.json(),
        noteResponse.json(),
      ]);
      setTasks(taskData);
      setNotes(noteData);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Couldn't connect to the workspace.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const clock = window.setTimeout(() => setNow(new Date()), 0);
    const workspace = window.setTimeout(() => void loadWorkspace(), 0);
    return () => {
      window.clearTimeout(clock);
      window.clearTimeout(workspace);
    };
  }, [loadWorkspace]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") setNoteDraft(null);
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const today = now ? localDay(now) : localDay(new Date());
  const remaining = tasks.filter((task) => !task.completed).length;
  const completedToday = tasks.filter((task) => task.completed).length;
  const completion = tasks.length
    ? Math.round((completedToday / tasks.length) * 100)
    : 0;

  const visibleTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesSearch =
        !query ||
        `${task.title} ${task.category} ${task.description}`
          .toLowerCase()
          .includes(query);
      const due = task.dueDate ? localDay(new Date(task.dueDate)) : null;
      if (!matchesSearch) return false;
      if (view === "done") return task.completed;
      if (task.completed) return false;
      if (view === "today") return due === null || due <= today;
      if (view === "upcoming") return due !== null && due > today;
      return true;
    });
  }, [tasks, search, today, view]);

  const visibleNotes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return notes.filter(
      (note) =>
        !query || `${note.title} ${note.content}`.toLowerCase().includes(query),
    );
  }, [notes, search]);

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      setPassword("");
      setAuthorized(true);
      await loadWorkspace();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Couldn't sign in.");
    } finally {
      setSaving(false);
    }
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskTitle.trim()) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle,
          category: taskCategory,
          priority: taskPriority,
          dueDate: taskDue,
          description: taskDescription,
        }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const task: Task = await response.json();
      setTasks((current) => [task, ...current]);
      setTaskTitle("");
      setTaskDue("");
      setTaskDescription("");
      setShowDetails(false);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Couldn't save your task.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateTask(task: Task, changes: Partial<Task>) {
    const updated = { ...task, ...changes };
    setTasks((current) =>
      current.map((item) => (item.id === task.id ? updated : item)),
    );
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const saved: Task = await response.json();
      setTasks((current) =>
        current.map((item) => (item.id === task.id ? saved : item)),
      );
    } catch (error) {
      setTasks((current) =>
        current.map((item) => (item.id === task.id ? task : item)),
      );
      setMessage(
        error instanceof Error ? error.message : "Couldn't update this task.",
      );
    }
  }

  async function deleteTask(task: Task) {
    setTasks((current) => current.filter((item) => item.id !== task.id));
    const response = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    if (!response.ok) {
      setTasks((current) => [...current, task]);
      setMessage(await responseError(response));
    }
  }

  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!noteDraft?.title.trim()) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(
        noteDraft.id ? `/api/notes/${noteDraft.id}` : "/api/notes",
        {
          method: noteDraft.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(noteDraft),
        },
      );
      if (!response.ok) throw new Error(await responseError(response));
      const saved: Note = await response.json();
      setNotes((current) =>
        noteDraft.id
          ? current.map((note) => (note.id === saved.id ? saved : note))
          : [saved, ...current],
      );
      setNoteDraft(null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Couldn't save your note.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function togglePin(note: Note) {
    const updated = { ...note, pinned: !note.pinned };
    setNotes((current) =>
      current.map((item) => (item.id === note.id ? updated : item)),
    );
    const response = await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: updated.pinned }),
    });
    if (!response.ok) {
      setNotes((current) =>
        current.map((item) => (item.id === note.id ? note : item)),
      );
      setMessage(await responseError(response));
    }
  }

  async function deleteNote(note: Note) {
    setNotes((current) => current.filter((item) => item.id !== note.id));
    const response = await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
    if (!response.ok) {
      setNotes((current) => [note, ...current]);
      setMessage(await responseError(response));
    }
  }

  async function signOut() {
    await fetch("/api/auth", { method: "DELETE" });
    setAuthorized(false);
  }

  const counts = {
    today: tasks.filter(
      (task) =>
        !task.completed &&
        (!task.dueDate || localDay(new Date(task.dueDate)) <= today),
    ).length,
    upcoming: tasks.filter(
      (task) =>
        !task.completed &&
        task.dueDate &&
        localDay(new Date(task.dueDate)) > today,
    ).length,
    all: remaining,
    done: completedToday,
  };

  const navItems: {
    id: View;
    label: string;
    count?: number;
    icon: typeof CalendarDays;
  }[] = [
    { id: "today", label: "Today", count: counts.today, icon: CalendarDays },
    { id: "upcoming", label: "Upcoming", count: counts.upcoming, icon: Clock3 },
    { id: "all", label: "All tasks", count: counts.all, icon: LayoutGrid },
    { id: "done", label: "Completed", count: counts.done, icon: CheckCircle2 },
  ];

  if (loading && !authorized) {
    return (
      <main className="loading-screen">
        <div className="loading-mark">
          <Feather size={19} />
        </div>
        <span>Opening your daybook</span>
      </main>
    );
  }

  if (protectedApp && !authorized) {
    return (
      <main className={`access-screen ${theme}`}>
        <form className="access-card" onSubmit={submitPassword}>
          <span className="brand-lockup">
            <span className="brand-mark">
              <Feather size={19} />
            </span>
            <span>daybook</span>
          </span>
          <span className="eyebrow">A LITTLE SPACE OF YOUR OWN</span>
          <h1>Your day, in good hands.</h1>
          <p>This private daybook is ready when you are.</p>
          <label className="sr-only" htmlFor="app-password">
            Password
          </label>
          <input
            id="app-password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {message && <p className="form-error">{message}</p>}
          <button
            className="primary-button access-submit"
            type="submit"
            disabled={saving}
          >
            {saving ? (
              "Opening…"
            ) : (
              <>
                Open my daybook <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </main>
    );
  }

  return (
    <div className="daybook-shell" data-theme={theme}>
      <aside className="sidebar">
        <a
          className="brand-lockup"
          href="#home"
          onClick={(event) => {
            event.preventDefault();
            setView("today");
            setSearch("");
          }}
        >
          <span className="brand-mark">
            <Feather size={19} strokeWidth={1.9} />
          </span>
          <span>
            daybook<span className="brand-period">.</span>
          </span>
        </a>
        <button
          className="sidebar-compose"
          onClick={() => {
            setView("today");
            document.getElementById("task-title")?.focus();
          }}
        >
          <Plus size={16} />
          <span>New task</span>
          <span className="shortcut-label">N</span>
        </button>

        <span className="sidebar-label">YOUR SPACE</span>
        <nav className="main-nav" aria-label="Workspace views">
          {navItems.map(({ id, label, count, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item${view === id ? " is-active" : ""}`}
              onClick={() => setView(id)}
            >
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
              {count ? <span className="nav-count">{count}</span> : null}
            </button>
          ))}
          <button
            className={`nav-item${view === "notes" ? " is-active" : ""}`}
            onClick={() => setView("notes")}
          >
            <BookOpen size={17} strokeWidth={1.8} />
            <span>Notes</span>
            {notes.length ? (
              <span className="nav-count">{notes.length}</span>
            ) : null}
          </button>
        </nav>

        <span className="sidebar-label category-label">YOUR CATEGORIES</span>
        <div className="category-list">
          {categories.map((category, index) => (
            <button
              className={`category-link category-${index}`}
              key={category}
              onClick={() => {
                setView("all");
                setSearch(category);
              }}
            >
              <span className="category-dot" />
              {category}
              <span className="category-total">
                {
                  tasks.filter(
                    (task) => task.category === category && !task.completed,
                  ).length
                }
              </span>
            </button>
          ))}
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Sparkles size={15} />
            <p>A gentle reminder</p>
            <span>You don’t have to do it all. Just the next thing.</span>
          </div>
          {protectedApp && (
            <button className="sign-out-button" onClick={signOut}>
              <LogOut size={15} />
              Lock daybook
            </button>
          )}
          <div className="profile-row">
            <span className="profile-avatar">
              <Feather size={15} />
            </span>
            <span className="profile-info">
              <strong>Your daybook</strong>
              <small>A place to begin again</small>
            </span>
            <span className="profile-status" title="Workspace ready" />
          </div>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <button
            className="mobile-brand"
            onClick={() => {
              setView("today");
              setSearch("");
            }}
          >
            <span className="brand-mark">
              <Feather size={18} />
            </span>
            daybook<span className="brand-period">.</span>
          </button>
          <div className="breadcrumb">
            <span>Your space</span>
            <span className="breadcrumb-divider">/</span>
            <strong>
              {view === "notes" ? "Notes" : viewDetails[view].label}
            </strong>
          </div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={16} strokeWidth={1.8} />
              <input
                ref={searchRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Find something…"
                aria-label="Search tasks and notes"
              />
              <kbd>⌘ K</kbd>
            </label>
            <button
              className="icon-button theme-toggle"
              onClick={() => storeTheme(theme === "light" ? "dark" : "light")}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            </button>
          </div>
        </header>

        <main className="workspace-main">
          <section className="welcome-row">
            <div>
              <p className="eyebrow">
                {now ? formatToday(now).toUpperCase() : "A FRESH PAGE"}
                <span className="eyebrow-flower"> ✳</span>
              </p>
              <h1>
                {view === "notes"
                  ? "Small thoughts, kept."
                  : viewDetails[view].heading}
              </h1>
              <p className="welcome-subtitle">
                {view === "notes"
                  ? "A home for the things you don’t want to forget."
                  : viewDetails[view].subheading}
              </p>
            </div>
            <button
              className="new-button"
              onClick={() =>
                view === "notes"
                  ? setNoteDraft({
                      id: null,
                      title: "",
                      content: "",
                      color: "butter",
                    })
                  : (setView("today"),
                    setTimeout(
                      () => document.getElementById("task-title")?.focus(),
                      0,
                    ))
              }
            >
              <Plus size={17} />
              {view === "notes" ? "New note" : "New task"}
            </button>
          </section>

          {message && (
            <div className="status-banner" role="status">
              <span className="status-dot" />
              <span>{message}</span>
              <button
                onClick={() => setMessage("")}
                aria-label="Dismiss message"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {view !== "notes" && (
            <section className="daily-card" aria-label="Daily progress">
              <div className="daily-copy">
                <span className="daily-overline">
                  <Sparkles size={13} /> YOUR DAILY RHYTHM
                </span>
                <p>
                  {remaining === 0
                    ? "You have a little room to breathe."
                    : remaining === 1
                      ? "One small step, then see how you feel."
                      : `You have ${remaining} things on your list. No need to rush.`}
                </p>
                <span className="daily-footnote">
                  A good day is made one moment at a time.
                </span>
              </div>
              <div className="daily-progress">
                <div className="progress-copy">
                  <span>TODAY’S PROGRESS</span>
                  <strong>
                    {completion}
                    <small>%</small>
                  </strong>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${completion}%` }} />
                </div>
                <span className="progress-caption">
                  {completedToday} done <span>·</span> {remaining} to go
                </span>
              </div>
              <span className="daily-sun" aria-hidden="true">
                <Sparkles size={20} />
              </span>
            </section>
          )}

          {view === "notes" ? (
            <section className="notes-section" aria-label="Your notes">
              <div className="section-heading">
                <div>
                  <span className="section-kicker">THE THINGS TO REMEMBER</span>
                  <h2>Your notes</h2>
                </div>
                <span className="section-total">
                  {visibleNotes.length}{" "}
                  {visibleNotes.length === 1 ? "note" : "notes"}
                </span>
              </div>
              {loading ? (
                <div className="empty-state">
                  <span className="loading-inline" />
                  Gathering your notes…
                </div>
              ) : visibleNotes.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">
                    <FileText size={20} />
                  </span>
                  <strong>
                    {search
                      ? "Nothing by that name just yet."
                      : "An empty page, full of possibility."}
                  </strong>
                  <span>
                    {search
                      ? "Try searching for another word."
                      : "Keep a little thought here before it slips away."}
                  </span>
                  <button
                    className="text-button"
                    onClick={() =>
                      setNoteDraft({
                        id: null,
                        title: "",
                        content: "",
                        color: "butter",
                      })
                    }
                  >
                    <Plus size={15} /> Write your first note
                  </button>
                </div>
              ) : (
                <div className="notes-grid">
                  {visibleNotes.map((note) => (
                    <article
                      className={`note-card note-${note.color}`}
                      key={note.id}
                    >
                      <div className="note-card-top">
                        <span className="note-kind">
                          {note.pinned ? (
                            <>
                              <Pin size={12} /> PINNED
                            </>
                          ) : (
                            <>A SMALL REMINDER</>
                          )}
                        </span>
                        <div className="note-card-actions">
                          <button
                            className={`quiet-icon${note.pinned ? " pin-active" : ""}`}
                            title={note.pinned ? "Unpin note" : "Pin note"}
                            aria-label={note.pinned ? "Unpin note" : "Pin note"}
                            onClick={() => void togglePin(note)}
                          >
                            <Pin size={15} />
                          </button>
                          <button
                            className="quiet-icon"
                            title="Delete note"
                            aria-label="Delete note"
                            onClick={() => void deleteNote(note)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                      <button
                        className="note-card-content"
                        onClick={() =>
                          setNoteDraft({
                            id: note.id,
                            title: note.title,
                            content: note.content,
                            color: note.color,
                          })
                        }
                      >
                        <strong>{note.title}</strong>
                        <span>
                          {note.content ||
                            "An idea waiting for a few more words…"}
                        </span>
                      </button>
                      <div className="note-card-bottom">
                        <span>
                          {new Date(note.updatedAt).toLocaleDateString("en", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <button
                          className="note-open-button"
                          onClick={() =>
                            setNoteDraft({
                              id: note.id,
                              title: note.title,
                              content: note.content,
                              color: note.color,
                            })
                          }
                          aria-label="Open note"
                        >
                          <ArrowRight size={15} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section className="tasks-section" aria-label="Your tasks">
              <div className="section-heading">
                <div>
                  <span className="section-kicker">
                    A THOUGHTFUL LITTLE PLAN
                  </span>
                  <h2>
                    {view === "today"
                      ? "On your plate"
                      : viewDetails[view].label}
                  </h2>
                </div>
                <span className="section-total">
                  {visibleTasks.length}{" "}
                  {visibleTasks.length === 1 ? "task" : "tasks"}
                </span>
              </div>

              {view !== "done" && (
                <form className="quick-add" onSubmit={createTask}>
                  <span className="quick-add-icon">
                    <Plus size={17} />
                  </span>
                  <input
                    id="task-title"
                    type="text"
                    maxLength={200}
                    value={taskTitle}
                    onChange={(event) => setTaskTitle(event.target.value)}
                    placeholder="What’s on your mind?"
                    aria-label="Task title"
                  />
                  <button
                    className="details-toggle"
                    type="button"
                    onClick={() => setShowDetails((current) => !current)}
                    aria-expanded={showDetails}
                    aria-label="Show task details"
                    title="Add a due date, category or priority"
                  >
                    <ChevronDown
                      size={15}
                      className={showDetails ? "rotate-chevron" : ""}
                    />
                    <span>Details</span>
                  </button>
                  <button
                    className="quick-submit"
                    type="submit"
                    disabled={saving || !taskTitle.trim()}
                    aria-label="Add task"
                  >
                    <ArrowRight size={16} />
                  </button>
                  {showDetails && (
                    <div className="quick-add-details">
                      <label>
                        <span>Category</span>
                        <select
                          value={taskCategory}
                          onChange={(event) =>
                            setTaskCategory(event.target.value)
                          }
                        >
                          {categories.map((category) => (
                            <option key={category}>{category}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Priority</span>
                        <select
                          value={taskPriority}
                          onChange={(event) =>
                            setTaskPriority(
                              event.target.value as (typeof priorities)[number],
                            )
                          }
                        >
                          {priorities.map((priority) => (
                            <option key={priority} value={priority}>
                              {priority.charAt(0).toUpperCase() +
                                priority.slice(1)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Due date</span>
                        <input
                          type="date"
                          value={taskDue}
                          onChange={(event) => setTaskDue(event.target.value)}
                        />
                      </label>
                      <label className="description-field">
                        <span>A little more to it</span>
                        <input
                          value={taskDescription}
                          maxLength={2000}
                          onChange={(event) =>
                            setTaskDescription(event.target.value)
                          }
                          placeholder="Add a note to your task"
                        />
                      </label>
                    </div>
                  )}
                </form>
              )}

              {loading ? (
                <div className="empty-state">
                  <span className="loading-inline" />
                  Making everything feel at home…
                </div>
              ) : visibleTasks.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">
                    <CheckCircle2 size={20} />
                  </span>
                  <strong>
                    {search
                      ? "Nothing by that name just yet."
                      : view === "done"
                        ? "The page is still unwritten."
                        : "A little breathing room."}
                  </strong>
                  <span>
                    {search
                      ? "Try a different word, or take a look around."
                      : view === "done"
                        ? "Your finished tasks will find a home here."
                        : "There’s nothing pressing. Let it be enough."}
                  </span>
                  {view !== "done" && !search && (
                    <button
                      className="text-button"
                      onClick={() =>
                        document.getElementById("task-title")?.focus()
                      }
                    >
                      <Plus size={15} /> Add something small
                    </button>
                  )}
                </div>
              ) : (
                <div className="task-list">
                  {visibleTasks.map((task) => {
                    const isOverdue =
                      !task.completed &&
                      task.dueDate &&
                      localDay(new Date(task.dueDate)) < today;
                    return (
                      <article
                        className={`task-row${task.completed ? " task-complete" : ""}`}
                        key={task.id}
                      >
                        <button
                          className="task-check"
                          aria-label={
                            task.completed
                              ? `Mark ${task.title} as incomplete`
                              : `Complete ${task.title}`
                          }
                          onClick={() =>
                            void updateTask(task, {
                              completed: !task.completed,
                            })
                          }
                        >
                          {task.completed ? (
                            <Check size={13} strokeWidth={2.4} />
                          ) : (
                            <Circle size={18} strokeWidth={1.5} />
                          )}
                        </button>
                        <div className="task-main">
                          <strong>{task.title}</strong>
                          {task.description && (
                            <span className="task-description">
                              {task.description}
                            </span>
                          )}
                          <div className="task-meta">
                            <span
                              className={`task-category task-category-${categories.indexOf(task.category) < 0 ? 0 : categories.indexOf(task.category)}`}
                            >
                              <span className="tiny-dot" />
                              {task.category}
                            </span>
                            {task.dueDate && (
                              <span
                                className={`task-date${isOverdue ? " date-overdue" : ""}`}
                              >
                                <CalendarDays size={12} />
                                {isOverdue ? "Overdue · " : ""}
                                {formatDate(task.dueDate)}
                              </span>
                            )}
                            <span
                              className={`priority-label priority-${task.priority}`}
                            >
                              <Flag size={11} />
                              {task.priority}
                            </span>
                          </div>
                        </div>
                        <button
                          className="task-delete quiet-icon"
                          aria-label={`Delete ${task.title}`}
                          title="Delete task"
                          onClick={() => void deleteTask(task)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </article>
                    );
                  })}
                  <button
                    className="add-another"
                    onClick={() => {
                      setView("today");
                      setTimeout(
                        () => document.getElementById("task-title")?.focus(),
                        0,
                      );
                    }}
                  >
                    <Plus size={15} /> Add one more thing
                  </button>
                </div>
              )}
            </section>
          )}

          <footer className="workspace-footer">
            <span>
              <Feather size={13} /> Take what you need, leave the rest.
            </span>
            <span>
              {notes.length} saved {notes.length === 1 ? "note" : "notes"}
              <span className="footer-dot"> · </span>
              {remaining} open {remaining === 1 ? "task" : "tasks"}
            </span>
          </footer>
        </main>
      </div>

      <nav className="mobile-nav" aria-label="Workspace views">
        {navItems.slice(0, 3).map(({ id, label, icon: Icon }) => (
          <button
            className={`mobile-nav-item${view === id ? " is-active" : ""}`}
            key={id}
            onClick={() => setView(id)}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
        <button
          className={`mobile-nav-item${view === "notes" ? " is-active" : ""}`}
          onClick={() => setView("notes")}
        >
          <BookOpen size={18} />
          <span>Notes</span>
        </button>
      </nav>

      {noteDraft && (
        <div
          className="dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setNoteDraft(null);
          }}
        >
          <form
            className={`note-dialog note-${noteDraft.color}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="note-dialog-title"
            onSubmit={saveNote}
          >
            <div className="dialog-header">
              <span className="section-kicker">
                {noteDraft.id ? "A THOUGHT, KEPT" : "A LITTLE THOUGHT"}
              </span>
              <button
                className="quiet-icon dialog-close"
                type="button"
                onClick={() => setNoteDraft(null)}
                aria-label="Close note editor"
              >
                <X size={18} />
              </button>
            </div>
            <label className="sr-only" htmlFor="note-title">
              Note title
            </label>
            <input
              autoFocus
              required
              maxLength={120}
              id="note-title"
              className="note-title-input"
              placeholder="Give this a name…"
              value={noteDraft.title}
              onChange={(event) =>
                setNoteDraft({ ...noteDraft, title: event.target.value })
              }
            />
            <label className="sr-only" htmlFor="note-content">
              Note contents
            </label>
            <textarea
              id="note-content"
              maxLength={5000}
              placeholder="Start wherever you are…"
              value={noteDraft.content}
              onChange={(event) =>
                setNoteDraft({ ...noteDraft, content: event.target.value })
              }
            />
            <div className="dialog-footer">
              <div className="note-color-picker" aria-label="Note color">
                {noteColors.map((color) => (
                  <button
                    type="button"
                    key={color}
                    aria-label={`${color} note color`}
                    title={`${color} note color`}
                    className={`color-swatch swatch-${color}${noteDraft.color === color ? " swatch-selected" : ""}`}
                    onClick={() => setNoteDraft({ ...noteDraft, color })}
                  />
                ))}
              </div>
              <button
                className="primary-button note-save"
                type="submit"
                disabled={saving || !noteDraft.title.trim()}
              >
                {saving ? (
                  "Saving…"
                ) : (
                  <>
                    {noteDraft.id ? "Save changes" : "Keep this note"}
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
