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
  const numericDate = (ms) => ymd(ms).split("-").reverse().join(".");
  const clock = (ms) => new Date(ms + offset * 1000).toISOString().slice(11, 16);
  const addDays = (date, n) => new Date(Date.parse(date + "T00:00:00.000Z") + n * 86400000).toISOString().slice(0, 10);
  const midnight = (date) => Date.parse(date + "T00:00:00.000Z") - offset * 1000;
  const atMidnight = (ms) => {
    const d = new Date(ms + offset * 1000);
    return d.getUTCHours() + d.getUTCMinutes() + d.getUTCSeconds() + d.getUTCMilliseconds() === 0;
  };

  const events = [];
  ((input && input.events) || []).forEach((e) => {
    const startMs = Date.parse(e.date_time || e.start_full);
    if (!Number.isFinite(startMs)) return;

    const endMs = Date.parse(e.end_full);
    const startDate = ymd(startMs);
    let lastDate = startDate;
    if (Number.isFinite(endMs)) {
      const endDate = ymd(endMs);
      lastDate = e.all_day || atMidnight(endMs) ? addDays(endDate, -1) : endDate;
      if (lastDate < startDate) lastDate = startDate;
    }
    const multi = lastDate > startDate;

    [today, tomorrow].forEach((target) => {
      if (target < startDate || target > lastDate) return;
      const occurs = midnight(target);
      const event = {
        title: clip(e.summary, 100),
        date_time: new Date(multi || e.all_day ? occurs : startMs).toISOString(),
        // Multi-day events sit above all-day events; ties stay alphabetical.
        sort_time: new Date(multi ? occurs - 1000 : e.all_day ? occurs : startMs).toISOString()
      };
      const description = clip(e.description, 200);
      if (description) event.description = description;
      if (multi) {
        event.range = e.all_day
          ? numericDate(startMs) + " - " + numericDate(midnight(lastDate))
          : numericDate(startMs) + ", " + clock(startMs) + " - " + numericDate(endMs) + ", " + clock(endMs);
      } else if (!e.all_day) {
        event.time_label = clock(startMs) + (Number.isFinite(endMs) ? " - " + clock(endMs) : "");
      }
      events.push(event);
    });
  });
  events.sort((a, b) => a.sort_time.localeCompare(b.sort_time) || a.title.localeCompare(b.title));

  const reminders = ((input && input.reminders) || [])
    .filter((r) => {
      const d = day(r.due_date);
      // Keep unparseable due dates visible as dateless instead of dropping the reminder.
      return !r.due_date || !d || d <= tomorrow;
    })
    .map((r) => {
      const dueDate = day(r.due_date);
      const due = dueDate ? text(r.due_date) : "";
      const dueMs = due ? Date.parse(due) : NaN;
      const p = prefix(Number(r.priority));
      const description = clip(r.notes, 200);
      const reminder = { title: clip(r.title, 100) };
      if (due) {
        reminder.due_date = due;
        if (atMidnight(dueMs)) {
          reminder.due_date_label = numericDate(dueMs);
        } else {
          if (dueDate === today || dueDate === tomorrow) reminder.due_time_label = clock(dueMs);
          reminder.due_date_label = numericDate(dueMs) + ", " + clock(dueMs);
        }
      }
      if (p) reminder.prefix = p;
      if (description) reminder.description = description;
      return reminder;
    });
  reminders.sort((a, b) => (a.due_date || "").localeCompare(b.due_date || "") || a.title.localeCompare(b.title));

  const overdue = reminders
    .filter((r) => r.due_date && day(r.due_date) < today)
    .sort((a, b) => b.due_date.localeCompare(a.due_date) || a.title.localeCompare(b.title));

  return { events, reminders, overdue };
}
