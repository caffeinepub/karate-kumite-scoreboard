import type { RecordMatch } from "../backend";

function formatTimestamp(ts: bigint): string {
  try {
    const ms = Number(ts / BigInt(1_000_000));
    if (ms === 0) return "N/A";
    return new Date(ms).toLocaleString();
  } catch {
    return "N/A";
  }
}

function foulLabel(foul: string): string {
  const map: Record<string, string> = {
    c1: "1C",
    c2: "2C",
    c3: "3C",
    hansoku: "HC",
    hansokumake: "H",
  };
  return map[foul] ?? foul;
}

export function exportHistoryToPDF(matches: RecordMatch[]): void {
  const rows = matches
    .map(
      (m, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${formatTimestamp(m.timestamp)}</td>
      <td>${m.category || "N/A"}</td>
      <td>${m.tatamiNumber}</td>
      <td>${m.ao.name || "N/A"}</td>
      <td>${Number(m.ao.ippon) * 3 + Number(m.ao.wazaari) * 2 + Number(m.ao.yuko)}</td>
      <td>${m.ao.ippon}/${m.ao.wazaari}/${m.ao.yuko}</td>
      <td>${m.ao.senshu ? "Yes" : "No"}</td>
      <td>${m.ao.warnings.map((w) => foulLabel(String(w.foul))).join(", ") || "-"}</td>
      <td>${m.aka.name || "N/A"}</td>
      <td>${Number(m.aka.ippon) * 3 + Number(m.aka.wazaari) * 2 + Number(m.aka.yuko)}</td>
      <td>${m.aka.ippon}/${m.aka.wazaari}/${m.aka.yuko}</td>
      <td>${m.aka.senshu ? "Yes" : "No"}</td>
      <td>${m.aka.warnings.map((w) => foulLabel(String(w.foul))).join(", ") || "-"}</td>
      <td>${m.winner || "-"}</td>
      <td>${m.totalTime}</td>
    </tr>`,
    )
    .join("");

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Karate Kumite Match History</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; background: #fff; color: #000; }
    h1 { text-align: center; font-size: 18px; margin-bottom: 8px; }
    p { text-align: center; font-size: 12px; margin-bottom: 16px; color: #444; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #333; padding: 4px 6px; text-align: center; }
    th { background: #222; color: #fff; }
    tr:nth-child(even) { background: #f5f5f5; }
    .ao-header { background: #1a56db; color: #fff; }
    .aka-header { background: #dc2626; color: #fff; }
    @media print {
      body { margin: 10px; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <h1>Karate Kumite Match History</h1>
  <p>Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Total Matches: ${matches.length}</p>
  <table>
    <thead>
      <tr>
        <th rowspan="2">#</th>
        <th rowspan="2">Date/Time</th>
        <th rowspan="2">Category</th>
        <th rowspan="2">Tatami</th>
        <th colspan="5" class="ao-header">AO (Blue)</th>
        <th colspan="5" class="aka-header">AKA (Red)</th>
        <th rowspan="2">Winner</th>
        <th rowspan="2">Time</th>
      </tr>
      <tr>
        <th class="ao-header">Name</th>
        <th class="ao-header">Score</th>
        <th class="ao-header">I/W/Y</th>
        <th class="ao-header">Senshu</th>
        <th class="ao-header">Warnings</th>
        <th class="aka-header">Name</th>
        <th class="aka-header">Score</th>
        <th class="aka-header">I/W/Y</th>
        <th class="aka-header">Senshu</th>
        <th class="aka-header">Warnings</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <br/>
  <div style="text-align:center">
    <button onclick="window.print()" style="padding:8px 20px;font-size:13px;background:#1a56db;color:#fff;border:none;border-radius:6px;cursor:pointer;margin-right:8px;">
      Print / Save as PDF
    </button>
    <button onclick="window.close()" style="padding:8px 20px;font-size:13px;background:#444;color:#fff;border:none;border-radius:6px;cursor:pointer;">
      Close
    </button>
  </div>
</body>
</html>`;

  // Use a Blob URL to avoid popup-blocker and blank-page issues
  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, "_blank");
  if (!printWindow) {
    // Popup blocked — fallback: open in same tab
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  }
  // Clean up the blob URL after a delay
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
