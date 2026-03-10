import type { RecordMatch } from "../backend";

function formatTimestamp(ts: bigint | number | unknown): string {
  try {
    let ms: number;
    if (typeof ts === "bigint") {
      ms = Number(ts / BigInt(1_000_000));
    } else if (typeof ts === "number") {
      // already milliseconds or nanoseconds
      ms = ts > 1e13 ? Math.floor(ts / 1_000_000) : ts;
    } else {
      // try to parse from string representation
      const n = BigInt(String(ts));
      ms = Number(n / BigInt(1_000_000));
    }
    if (!ms || ms === 0) return "N/A";
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

function safeNum(v: unknown): number {
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number") return v;
  return Number(v) || 0;
}

export function exportHistoryToPDF(matches: RecordMatch[]): void {
  const rows = matches
    .map((m, i) => {
      const aoI = safeNum(m.ao.ippon);
      const aoW = safeNum(m.ao.wazaari);
      const aoY = safeNum(m.ao.yuko);
      const akaI = safeNum(m.aka.ippon);
      const akaW = safeNum(m.aka.wazaari);
      const akaY = safeNum(m.aka.yuko);
      return `
    <tr>
      <td>${i + 1}</td>
      <td>${formatTimestamp(m.timestamp)}</td>
      <td>${m.category || "-"}</td>
      <td>${m.tatamiNumber}</td>
      <td>${m.ao.name || "N/A"}</td>
      <td>${aoI * 3 + aoW * 2 + aoY}</td>
      <td>${aoI}/${aoW}/${aoY}</td>
      <td>${m.ao.senshu ? "Yes" : "No"}</td>
      <td>${m.ao.warnings.map((w) => foulLabel(String(w.foul))).join(", ") || "-"}</td>
      <td>${m.aka.name || "N/A"}</td>
      <td>${akaI * 3 + akaW * 2 + akaY}</td>
      <td>${akaI}/${akaW}/${akaY}</td>
      <td>${m.aka.senshu ? "Yes" : "No"}</td>
      <td>${m.aka.warnings.map((w) => foulLabel(String(w.foul))).join(", ") || "-"}</td>
      <td>${m.winner || "-"}</td>
      <td>${m.totalTime}</td>
    </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Karate Kumite Match History</title>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; background: #fff; color: #000; }
    h1 { text-align: center; font-size: 18px; margin-bottom: 10px; }
    .meta { text-align: center; margin-bottom: 16px; font-size: 12px; color: #444; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #333; padding: 4px 6px; text-align: center; }
    th { background: #222; color: #fff; }
    tr:nth-child(even) { background: #f5f5f5; }
    .ao-header { background: #1a56db; color: #fff; }
    .aka-header { background: #dc2626; color: #fff; }
    .print-btn {
      display: block;
      margin: 0 auto 20px auto;
      padding: 10px 28px;
      background: #1a56db;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
    }
    .close-btn {
      display: block;
      margin: 12px auto 0 auto;
      padding: 8px 22px;
      background: #555;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
    }
    @media print {
      .print-btn, .close-btn { display: none !important; }
      body { margin: 10px; }
    }
  </style>
</head>
<body>
  <h1>Karate Kumite Match History</h1>
  <p class="meta">Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Total Matches: ${matches.length}</p>
  <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
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
  <button class="close-btn" onclick="window.close()">Close</button>
</body>
</html>`;

  // Always use direct download — popup/blob-URL approaches are blocked by the
  // browser's CSP in the hosted ICP environment. A direct anchor click always works.
  try {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const dlUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = dlUrl;
    a.download = `kumite-history-${new Date().toISOString().slice(0, 10)}.html`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(dlUrl), 10000);
  } catch {
    // Absolute last resort: data URI download
    const a = document.createElement("a");
    a.href = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    a.download = `kumite-history-${new Date().toISOString().slice(0, 10)}.html`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
