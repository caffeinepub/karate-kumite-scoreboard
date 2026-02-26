import type { RecordMatch } from '../backend';

function formatTimestamp(ts: bigint): string {
  const ms = Number(ts / BigInt(1_000_000));
  if (ms === 0) return 'N/A';
  return new Date(ms).toLocaleString();
}

function foulLabel(foul: string): string {
  const map: Record<string, string> = {
    c1: '1C',
    c2: '2C',
    c3: '3C',
    hansoku: 'HC',
    hansokumake: 'H',
  };
  return map[foul] ?? foul;
}

export function exportHistoryToPDF(matches: RecordMatch[]): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const rows = matches
    .map(
      (m, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${formatTimestamp(m.timestamp)}</td>
      <td>${m.category}</td>
      <td>${m.tatamiNumber}</td>
      <td>${m.ao.name || 'N/A'}</td>
      <td>${Number(m.ao.ippon) * 3 + Number(m.ao.wazaari) * 2 + Number(m.ao.yuko)}</td>
      <td>${m.ao.ippon}/${m.ao.wazaari}/${m.ao.yuko}</td>
      <td>${m.ao.senshu ? 'Yes' : 'No'}</td>
      <td>${m.ao.warnings.map(w => foulLabel(String(w.foul))).join(', ') || '-'}</td>
      <td>${m.aka.name || 'N/A'}</td>
      <td>${Number(m.aka.ippon) * 3 + Number(m.aka.wazaari) * 2 + Number(m.aka.yuko)}</td>
      <td>${m.aka.ippon}/${m.aka.wazaari}/${m.aka.yuko}</td>
      <td>${m.aka.senshu ? 'Yes' : 'No'}</td>
      <td>${m.aka.warnings.map(w => foulLabel(String(w.foul))).join(', ') || '-'}</td>
      <td>${m.winner || '-'}</td>
      <td>${m.totalTime}</td>
    </tr>`
    )
    .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Karate Kumite Match History</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; }
        h1 { text-align: center; font-size: 18px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #333; padding: 4px 6px; text-align: center; }
        th { background: #222; color: #fff; }
        tr:nth-child(even) { background: #f5f5f5; }
        .ao-header { background: #1a56db; color: #fff; }
        .aka-header { background: #dc2626; color: #fff; }
        @media print { body { margin: 10px; } }
      </style>
    </head>
    <body>
      <h1>Karate Kumite Match History</h1>
      <p>Generated: ${new Date().toLocaleString()} | Total Matches: ${matches.length}</p>
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
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 500);
}
