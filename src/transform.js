function run(input, now) {
  const user = (input && input.trmnl && input.trmnl.user) || {};
  const tz = user.time_zone_iana || user.time_zone || "UTC";
  now = now || new Date();

  const dayFmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "long", day: "numeric" });
  const ymdFmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  const hmFmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

  const ymd = (d) => ymdFmt.format(d);
  const label = (d) => dayFmt.format(d);
  const hm = (d) => hmFmt.format(d);

  const today = ymd(now);
  const tomorrow = ymd(new Date(now.getTime() + 86400000));

  const sortKey = (allDay, timeMs, type, title) =>
    [allDay ? 0 : 1, timeMs, type === "event" ? 0 : 1, (title || "").toLowerCase()];

  const eventItem = (e) => {
    const start = e.date_time || e.start_full;
    const end = e.end_full;
    const allDay = !!e.all_day;
    const time = allDay
      ? "all-day"
      : start && end
        ? `${hm(new Date(start))} - ${hm(new Date(end))}`
        : start
          ? hm(new Date(start))
          : "";
    return {
      type: "event",
      title: e.summary || "",
      description: e.description || "",
      time,
      all_day: allDay,
      timeMs: allDay ? 0 : start ? new Date(start).getTime() : 0
    };
  };

  const reminderItem = (r, due) => {
    const timed = !!due && /T\d{2}:\d{2}/.test(due);
    const time = !due ? "" : timed ? hm(new Date(due)) : "all-day";
    return {
      type: "reminder",
      title: r.title || "",
      description: r.notes || "",
      time,
      all_day: due ? !timed : false,
      // ponytail: date-only due_date parses as UTC midnight; fine for the Companion's ISO 8601 payloads
      timeMs: due ? new Date(due).getTime() : 0
    };
  };

  const todayItems = [];
  const tomorrowItems = [];
  const overdue = [];
  const dateless = [];

  (input && input.events || []).forEach((e) => {
    const start = e.date_time || e.start_full;
    if (!start) return;
    const day = ymd(new Date(start));
    if (day === today) todayItems.push(eventItem(e));
    else if (day === tomorrow) tomorrowItems.push(eventItem(e));
  });

  (input && input.reminders || []).forEach((r) => {
    if (!r.due_date) { dateless.push(reminderItem(r, null)); return; }
    const day = ymd(new Date(r.due_date));
    const item = reminderItem(r, r.due_date);
    if (day === today) todayItems.push(item);
    else if (day === tomorrow) tomorrowItems.push(item);
    else if (day < today) overdue.push(item);
  });

  const bySort = (a, b) => {
    const ka = sortKey(a.all_day, a.timeMs, a.type, a.title);
    const kb = sortKey(b.all_day, b.timeMs, b.type, b.title);
    for (let i = 0; i < ka.length; i++) {
      if (ka[i] < kb[i]) return -1;
      if (ka[i] > kb[i]) return 1;
    }
    return 0;
  };

  todayItems.sort(bySort);
  tomorrowItems.sort(bySort);
  overdue.sort((a, b) => b.timeMs - a.timeMs);
  dateless.sort((a, b) => (a.title || "").localeCompare(b.title || ""));

  const sections = [todayItems, overdue, dateless].filter((s) => s.length);
  const todayItemsFinal = [];
  sections.forEach((sec, i) => {
    if (i > 0) todayItemsFinal.push({ type: "divider" });
    todayItemsFinal.push(...sec);
  });

  const overdueCount = overdue.length;
  const tomorrowDate = new Date(now.getTime() + 86400000);

  return {
    days: [
      {
        label: overdueCount > 0 ? `${label(now)} (Overdue: ${overdueCount})` : label(now),
        overdue: overdueCount,
        items: todayItemsFinal
      },
      { label: label(tomorrowDate), items: tomorrowItems }
    ]
  };
}
