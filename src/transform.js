function run(input) {
  const user = (input && input.trmnl && input.trmnl.user) || {};
  // ponytail: offset seconds, same math as the Liquid (base_ts | plus: utc_offset | date: "%Y-%m-%d")
  const offset = user.utc_offset || 0;
  const ymd = (ms) => new Date(ms + offset * 1000).toISOString().slice(0, 10);
  const now = Date.now();
  const today = ymd(now);
  const tomorrow = ymd(now + 86400000);
  const clip = (s, n) => (s && s.length > n ? s.slice(0, n) + "..." : s || "");

  const events = ((input && input.events) || [])
    .filter((e) => {
      const s = e.date_time || e.start_full;
      return s && (ymd(Date.parse(s)) === today || ymd(Date.parse(s)) === tomorrow);
    })
    .map((e) => ({
      summary: clip(e.summary, 100),
      date_time: e.date_time || e.start_full || "",
      end_full: e.end_full || "",
      all_day: !!e.all_day,
      description: clip(e.description, 200)
    }));

  const reminders = ((input && input.reminders) || [])
    .filter((r) => !r.due_date || ymd(Date.parse(r.due_date)) <= tomorrow)
    .map((r) => ({
      title: clip(r.title, 100),
      notes: clip(r.notes, 200),
      priority: r.priority || 0,
      due_date: r.due_date || ""
    }));

  return { events, reminders };
}
