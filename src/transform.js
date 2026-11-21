function run(input) {
  const user = (input && input.trmnl && input.trmnl.user) || {};
  const offset = user.utc_offset || 0;
  const ymd = (ms) => new Date(ms + offset * 1000).toISOString().slice(0, 10);
  const day = (s) => {
    const ms = Date.parse(s);
    return Number.isFinite(ms) ? ymd(ms) : "";
  };
  const now = Date.now();
  const today = ymd(now);
  const tomorrow = ymd(now + 86400000);
  const text = (s) => String(s || "").trim();
  const clip = (s, n) => {
    s = text(s);
    return s.length > n ? s.slice(0, n) + "..." : s;
  };
  const prefix = (p) => (p === 1 ? "!!! " : p === 5 ? "!! " : p === 9 ? "! " : "");

  const events = ((input && input.events) || [])
    .filter((e) => {
      const d = day(e.date_time || e.start_full);
      return d === today || d === tomorrow;
    })
    .map((e) => {
      const event = {
        title: clip(e.summary, 100),
        date_time: text(e.date_time || e.start_full),
        all_day: !!e.all_day
      };
      const description = clip(e.description, 200);
      const end = text(e.end_full);
      if (description) event.description = description;
      if (end) event.end_full = end;
      return event;
    });

  const reminders = ((input && input.reminders) || [])
    .filter((r) => {
      const d = day(r.due_date);
      // Keep unparseable due dates visible as dateless instead of dropping the reminder.
      return !r.due_date || !d || d <= tomorrow;
    })
    .map((r) => {
      const due = day(r.due_date) ? text(r.due_date) : "";
      const p = prefix(Number(r.priority));
      const description = clip(r.notes, 200);
      const reminder = { title: clip(r.title, 100) };
      if (due) reminder.due_date = due;
      if (p) reminder.prefix = p;
      if (description) reminder.description = description;
      return reminder;
    });

  return { events, reminders };
}
