interface Participant {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface Match {
  participant1: Participant;
  participant2: Participant;
  matchTypes: {
    friendship: boolean;
    dating: boolean;
  };
}

export const exportMatchesToCSV = (matches: Match[], eventName: string) => {
  if (matches.length === 0) return;

  const headers = [
    "Nombre 1",
    "Email 1",
    "Teléfono 1",
    "Nombre 2",
    "Email 2",
    "Teléfono 2",
    "Tipo de Match",
  ];

  const rows = matches.map((match) => {
    const matchType = [];
    if (match.matchTypes.friendship) matchType.push("Amistad");
    if (match.matchTypes.dating) matchType.push("Ligue");

    return [
      match.participant1.name,
      match.participant1.email || "",
      match.participant1.phone || "",
      match.participant2.name,
      match.participant2.email || "",
      match.participant2.phone || "",
      matchType.join(" + ") || "Match",
    ];
  });

  // Escape CSV values
  const escapeCSV = (value: string) => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const csv = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) => row.map(escapeCSV).join(",")),
  ].join("\n");

  // Add BOM for Excel UTF-8 compatibility
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `matches-${eventName.toLowerCase().replace(/\s+/g, "-")}.csv`;
  a.click();

  URL.revokeObjectURL(url);
};

export const exportMatchesToExcel = async (matches: Match[], eventName: string) => {
  // Dynamically import xlsx to avoid loading it unless needed
  const XLSX = await import("xlsx");

  const data = matches.map((match) => {
    const matchType = [];
    if (match.matchTypes.friendship) matchType.push("Amistad");
    if (match.matchTypes.dating) matchType.push("Ligue");

    return {
      "Nombre 1": match.participant1.name,
      "Email 1": match.participant1.email || "",
      "Teléfono 1": match.participant1.phone || "",
      "Nombre 2": match.participant2.name,
      "Email 2": match.participant2.email || "",
      "Teléfono 2": match.participant2.phone || "",
      "Tipo de Match": matchType.join(" + ") || "Match",
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Matches");

  // Auto-size columns
  const colWidths = [
    { wch: 20 }, // Nombre 1
    { wch: 25 }, // Email 1
    { wch: 15 }, // Teléfono 1
    { wch: 20 }, // Nombre 2
    { wch: 25 }, // Email 2
    { wch: 15 }, // Teléfono 2
    { wch: 15 }, // Tipo de Match
  ];
  ws["!cols"] = colWidths;

  XLSX.writeFile(wb, `matches-${eventName.toLowerCase().replace(/\s+/g, "-")}.xlsx`);
};
