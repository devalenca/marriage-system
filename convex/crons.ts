import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 11:30 UTC = 08:30 in America/Sao_Paulo: reminders land with the morning
// coffee, before the workday buries them.
crons.daily(
	"daily email reminders",
	{ hourUTC: 11, minuteUTC: 30 },
	internal.notifications.runDailyReminders,
	{},
);

export default crons;
