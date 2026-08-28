/** RFC-style CSV. Indian grouping like 1,00,000 is quoted so it stays one column. */
export function gridToCsv(cells: string[][]): string {
  return cells.map((row) => row.map(escapeCsvField).join(",")).join("\r\n") + "\r\n";
}

export function gridToTsv(cells: string[][]): string {
  return cells.map((row) => row.map(escapeTsvField).join("\t")).join("\n") + "\n";
}

function escapeCsvField(value: string): string {
  const needsQuotes = /[",\r\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function escapeTsvField(value: string): string {
  return value.replace(/\t/g, " ").replace(/\r?\n/g, " ");
}
