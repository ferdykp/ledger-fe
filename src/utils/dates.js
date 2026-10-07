export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function localMonth(date = new Date()) {
  return localDate(date).slice(0, 7);
}
export function previousMonth(date = new Date()) {
  return localMonth(new Date(date.getFullYear(), date.getMonth() - 1, 1));
}
