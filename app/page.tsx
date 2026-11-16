"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Priority = "Low" | "Medium" | "High";
type Filter = "All tasks" | "Today" | "Upcoming" | "Completed";

type Task = {
  id: string;
  title: string;
  project: string;
  dueDate: string;
  priority: Priority;
  completed: boolean;
};

const STORAGE_KEY = "daymark-tasks";
const filters: Filter[] = ["All tasks", "Today", "Upcoming", "Completed"];

function dateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function makeStarterTasks(): Task[] {
  return [
    { id: "starter-1", title: "Plan the week and set priorities", project: "Personal", dueDate: dateOffset(0), priority: "High", completed: false },
    { id: "starter-2", title: "Review project proposal", project: "Work", dueDate: dateOffset(0), priority: "Medium", completed: false },
    { id: "starter-3", title: "Reply to design feedback", project: "Work", dueDate: dateOffset(0), priority: "Low", completed: true },
    { id: "starter-4", title: "Pick up a few groceries", project: "Personal", dueDate: dateOffset(1), priority: "Low", completed: false },
    { id: "starter-5", title: "Prepare slides for the team sync", project: "Work", dueDate: dateOffset(2), priority: "High", completed: false },
  ];
}

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") return false;
  const task = value as Record<string, unknown>;
  return (
    typeof task.id === "string" &&
    typeof task.title === "string" &&
    typeof task.project === "string" &&
    typeof task.dueDate === "string" &&
    (task.priority === "Low" || task.priority === "Medium" || task.priority === "High") &&
    typeof task.completed === "boolean"
  );
}

function formatDueDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  const today = dateOffset(0);
  if (value === today) return "Today";
  if (value === dateOffset(1)) return "Tomorrow";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Icon({
  name,
  size = 18,
}: {
  name: "grid" | "sun" | "calendar" | "check" | "search" | "plus" | "more" | "clock" | "spark";
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  const paths = {
    grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14Z" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeFilter, setActiveFilter] = useState<Filter>("All tasks");
  const [query, setQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every(isTask)) setTasks(parsed);
        else throw new Error("Saved task data has an unexpected format.");
      } else {
        setTasks(makeStarterTasks());
      }
    } catch (error) {
      console.error("Could not load saved tasks.", error);
      setTasks(makeStarterTasks());
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error("Could not save tasks.", error);
    }
  }, [tasks, ready]);

  const todayKey = dateOffset(0);
  const todayTasks = tasks.filter((task) => !task.completed && task.dueDate <= todayKey);
  const completedTasks = tasks.filter((task) => task.completed);
  const openTasks = tasks.filter((task) => !task.completed);
  const visibleTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
      if (activeFilter === "Today") return !task.completed && task.dueDate <= todayKey;
      if (activeFilter === "Upcoming") return !task.completed && task.dueDate > todayKey;
      if (activeFilter === "Completed") return task.completed;
      return true;
    });
    const normalizedQuery = query.trim().toLowerCase();
    return normalizedQuery
      ? filtered.filter((task) => `${task.title} ${task.project}`.toLowerCase().includes(normalizedQuery))
      : filtered;
  }, [activeFilter, query, tasks, todayKey]);

  function toggleTask(id: string) {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)),
    );
  }

  function deleteTask(id: string) {
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;
    setTasks((current) => [
      {
        id: crypto.randomUUID(),
        title,
        project: String(formData.get("project") ?? "Personal"),
        dueDate: String(formData.get("dueDate") ?? todayKey),
        priority: String(formData.get("priority") ?? "Medium") as Priority,
        completed: false,
      },
      ...current,
    ]);
    setActiveFilter("All tasks");
    setIsAdding(false);
  }

  const filterIcons: Record<Filter, "grid" | "sun" | "calendar" | "check"> = {
    "All tasks": "grid",
    Today: "sun",
    Upcoming: "calendar",
    Completed: "check",
  };
  const counts: Record<Filter, number> = {
    "All tasks": openTasks.length,
    Today: todayTasks.length,
    Upcoming: openTasks.filter((task) => task.dueDate > todayKey).length,
    Completed: completedTasks.length,
  };
  const completionPercent = tasks.length ? (completedTasks.length / tasks.length) * 100 : 0;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="Daymark home">
          <span className="brand-mark"><Icon name="spark" size={19} /></span>
          <span>daymark<span className="brand-period">.</span></span>
        </a>

        <div className="workspace-label">WORKSPACE</div>
        <button className="workspace-switcher">
          <span className="workspace-avatar">S</span>
          <span className="workspace-name">Sam&apos;s space<small>Personal workspace</small></span>
          <span className="chevron">⌄</span>
        </button>

        <div className="nav-label">YOUR SPACE</div>
        <nav className="nav-list" aria-label="Task filters">
          {filters.map((filter) => (
            <button
              className={`nav-item ${activeFilter === filter ? "active" : ""}`}
              key={filter}
              onClick={() => setActiveFilter(filter)}
            >
              <Icon name={filterIcons[filter]} size={18} />
              <span>{filter}</span>
              <span className="nav-count">{counts[filter]}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="focus-card">
            <div className="focus-icon"><Icon name="spark" size={17} /></div>
            <strong>Make space for focus</strong>
            <p>A little progress each day adds up to big results.</p>
            <div className="focus-progress"><span style={{ width: `${completionPercent}%` }} /></div>
            <small>{completedTasks.length} of {tasks.length} tasks completed</small>
          </div>
          <button className="profile-button">
            <span className="profile-avatar">S</span>
            <span className="profile-name">Sam Taylor<small>Free plan</small></span>
            <Icon name="more" size={18} />
          </button>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div className="breadcrumb">My workspace <span>/</span> <strong>{activeFilter}</strong></div>
          <div className="topbar-actions">
            <label className="search-box">
              <Icon name="search" size={17} />
              <input
                type="search"
                placeholder="Search tasks..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <kbd>⌘ K</kbd>
            </label>
            <button className="avatar-small" aria-label="Your profile">S</button>
          </div>
        </header>

        <div className="content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow"><span className="live-dot" /> YOUR PERSONAL DASHBOARD</div>
              <h1>{activeFilter === "Today" ? "Today, at a glance." : activeFilter === "Upcoming" ? "Good things are ahead." : activeFilter === "Completed" ? "Look how far you’ve come." : "Make today count."}</h1>
              <p className="subtitle">
                {activeFilter === "Today"
                  ? `You have ${todayTasks.length} ${todayTasks.length === 1 ? "task" : "tasks"} to focus on today.`
                  : "A little clarity goes a long way. Here's what's on your plate."}
              </p>
            </div>
            <button className="primary-button" onClick={() => setIsAdding(true)}>
              <Icon name="plus" size={18} /> New task
            </button>
          </div>

          <div className="date-line"><Icon name="calendar" size={15} /> {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>

          <section className="stats-grid" aria-label="Task summary">
            <article className="stat-card stat-highlight">
              <div className="stat-top"><span>On your list</span><span className="stat-icon purple"><Icon name="grid" size={17} /></span></div>
              <div className="stat-number">{openTasks.length}<span> tasks</span></div>
              <div className="stat-caption">Ready when you are</div>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span>Due today</span><span className="stat-icon peach"><Icon name="sun" size={17} /></span></div>
              <div className="stat-number">{todayTasks.length}<span> tasks</span></div>
              <div className="stat-caption">{todayTasks.length ? "One step at a time" : "A little breathing room"}</div>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span>Completed</span><span className="stat-icon green"><Icon name="check" size={17} /></span></div>
              <div className="stat-number">{completedTasks.length}<span> tasks</span></div>
              <div className="stat-caption">Nice work, keep going</div>
            </article>
          </section>

          <section className="tasks-section">
            <div className="section-heading">
              <div>
                <h2>{activeFilter === "All tasks" ? "Your tasks" : activeFilter}</h2>
                <p>Keep your next steps close.</p>
              </div>
              <div className="task-count">{visibleTasks.length} {visibleTasks.length === 1 ? "task" : "tasks"}</div>
            </div>

            <div className="task-list">
              {!ready ? (
                <div className="empty-state">Getting your tasks ready…</div>
              ) : visibleTasks.length ? (
                visibleTasks.map((task) => (
                  <article className={`task-row ${task.completed ? "is-complete" : ""}`} key={task.id}>
                    <button
                      className={`task-checkbox ${task.completed ? "checked" : ""}`}
                      onClick={() => toggleTask(task.id)}
                      aria-label={task.completed ? `Mark ${task.title} incomplete` : `Complete ${task.title}`}
                    >
                      {task.completed && <Icon name="check" size={14} />}
                    </button>
                    <div className="task-info">
                      <div className="task-title">{task.title}</div>
                      <div className="task-meta">
                        <span className={`project-dot ${task.project.toLowerCase()}`} />
                        <span>{task.project}</span>
                        <span className="meta-divider">·</span>
                        <span className={task.dueDate < todayKey && !task.completed ? "overdue" : ""}>
                          <Icon name="clock" size={13} /> {formatDueDate(task.dueDate)}
                        </span>
                      </div>
                    </div>
                    <span className={`priority priority-${task.priority.toLowerCase()}`}>
                      <span /> {task.priority}
                    </span>
                    <button className="delete-task" onClick={() => deleteTask(task.id)} aria-label={`Delete ${task.title}`}>×</button>
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  <span className="empty-icon"><Icon name="check" size={22} /></span>
                  <strong>{query ? "No matching tasks" : "Nothing on your list"}</strong>
                  <p>{query ? "Try a different search." : "Enjoy the breathing room, or add a new task."}</p>
                  {!query && <button className="text-button" onClick={() => setIsAdding(true)}>Add a task <span>→</span></button>}
                </div>
              )}
            </div>
          </section>
          <footer className="footer-note"><Icon name="spark" size={14} /> Small steps, every day.</footer>
        </div>
      </section>

      {isAdding && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsAdding(false);
        }}>
          <form className="task-modal" onSubmit={addTask}>
            <div className="modal-heading">
              <div><div className="eyebrow">A FRESH START</div><h2>Create a task</h2></div>
              <button type="button" className="modal-close" onClick={() => setIsAdding(false)} aria-label="Close">×</button>
            </div>
            <label className="field-label" htmlFor="task-title">Task name</label>
            <input id="task-title" name="title" className="form-input" placeholder="What would you like to get done?" autoFocus required maxLength={120} />
            <div className="form-row">
              <div><label className="field-label" htmlFor="task-date">Due date</label><input id="task-date" name="dueDate" className="form-input" type="date" defaultValue={todayKey} required /></div>
              <div><label className="field-label" htmlFor="task-priority">Priority</label>
                <select id="task-priority" name="priority" className="form-input" defaultValue="Medium">
                  <option>Low</option><option>Medium</option><option>High</option>
                </select>
              </div>
            </div>
            <label className="field-label" htmlFor="task-project">List</label>
            <select id="task-project" name="project" className="form-input" defaultValue="Personal">
              <option>Personal</option><option>Work</option>
            </select>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setIsAdding(false)}>Cancel</button>
              <button type="submit" className="primary-button"><Icon name="plus" size={17} /> Add task</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
