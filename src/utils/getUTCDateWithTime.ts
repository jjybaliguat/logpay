export function getUTCDateWithTime(base: Date, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  d.setUTCHours(hours, minutes, 0, 0); // Set hours and minutes in UTC
  return d;
}