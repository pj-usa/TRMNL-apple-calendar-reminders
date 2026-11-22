function run(input) {
  input = input || {};
  const user = (input.trmnl && input.trmnl.user) || {};
  const offset = user.utc_offset || 0;
  const local = (ms) => new Date(ms + offset * 1000);
  const ymd = (ms) => local(ms).toISOString().slice(0, 10);
  const now = Date.now();
  const today = ymd(now);
  const tomorrow = ymd(now + 86400000);
  const clip = (s, n) => {
    const value = String(s || "").trim();
    return value.length > n ? value.slice(0, n) + "..." : value;
  };
  const prefix = (p) => (p === 1 ? "!!! " : p === 5 ? "!! " : p === 9 ? "! " : "");
  const dottedDate = (date) => date.split("-").reverse().join(".");
  const numericDate = (ms) => dottedDate(ymd(ms));
  const clock = (ms) => local(ms).toISOString().slice(11, 16);
  const midnight = (date) => Date.parse(date + "T00:00:00.000Z") - offset * 1000;
  const addDays = (date, n) => ymd(midnight(date) + n * 86400000);
  const atMidnight = (ms) => {
    const d = local(ms);
    return (
      d.getUTCHours() + d.getUTCMinutes() + d.getUTCSeconds() + d.getUTCMilliseconds() === 0
    );
  };

  const events = [];
  (input.events || []).forEach((e) => {
    const startMs = Date.parse(e.date_time || e.start_full);
    if (!Number.isFinite(startMs)) return;

    const endMs = Date.parse(e.end_full);
    const startDate = ymd(startMs);
    let lastDate = startDate;
    if (Number.isFinite(endMs)) {
      const endDate = ymd(endMs);
      lastDate = (e.all_day || atMidnight(endMs)) ? addDays(endDate, -1) : endDate;
      if (lastDate < startDate) lastDate = startDate;
    }
    const multi = lastDate > startDate;

    [today, tomorrow].forEach((target) => {
      if (target < startDate || target > lastDate) return;
      const occurs = midnight(target);
      const dateMs = (multi || e.all_day) ? occurs : startMs;
      // Multi-day events sit above all-day events; ties stay alphabetical.
      const sortMs = multi ? occurs - 1000 : dateMs;
      const event = {
        title: clip(e.summary, 100),
        date_time: new Date(dateMs).toISOString(),
        sort_time: new Date(sortMs).toISOString()
      };
      const description = clip(e.description, 200);
      if (description) event.description = description;
      if (multi) {
        event.range = e.all_day
          ? dottedDate(startDate) + " - " + dottedDate(lastDate)
          : numericDate(startMs) + ", " + clock(startMs) + " - " +
            numericDate(endMs) + ", " + clock(endMs);
      } else if (!e.all_day) {
        event.time_label =
          clock(startMs) + (Number.isFinite(endMs) ? " - " + clock(endMs) : "");
      }
      events.push(event);
    });
  });
  events.sort(
    (a, b) => a.sort_time.localeCompare(b.sort_time) || a.title.localeCompare(b.title)
  );

  const reminders = [];
  (input.reminders || []).forEach((r) => {
    const dueMs = Date.parse(r.due_date);
    const dueDate = Number.isFinite(dueMs) ? ymd(dueMs) : "";
    // Keep unparseable due dates visible as dateless instead of dropping the reminder.
    if (dueDate && dueDate > tomorrow) return;

    const reminder = { title: clip(r.title, 100) };
    if (dueDate) {
      // Normalize so Liquid can compare due_date with event sort_time.
      reminder.due_date = new Date(dueMs).toISOString();
      if (atMidnight(dueMs)) {
        reminder.due_date_label = numericDate(dueMs);
      } else {
        if (dueDate === today || dueDate === tomorrow) reminder.due_time_label = clock(dueMs);
        reminder.due_date_label = numericDate(dueMs) + ", " + clock(dueMs);
      }
    }
    const p = prefix(Number(r.priority));
    if (p) reminder.prefix = p;
    const description = clip(r.notes, 200);
    if (description) reminder.description = description;
    reminders.push(reminder);
  });
  reminders.sort(
    (a, b) => (a.due_date || "").localeCompare(b.due_date || "") || a.title.localeCompare(b.title)
  );

  return { events, reminders };
}
