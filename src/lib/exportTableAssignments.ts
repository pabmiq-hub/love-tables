interface Participant {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  age_range?: string | null;
}

interface RoundTable {
  round: number;
  tables: Participant[][];
}

export const exportTableAssignmentsToExcel = async (
  tables: RoundTable[],
  participants: Participant[],
  eventName: string
) => {
  const XLSX = await import("xlsx");

  // Create a map of participant assignments per round
  const participantAssignments: Record<string, Record<number, { table: number; companions: string[] }>> = {};

  // Initialize all participants
  participants.forEach(p => {
    participantAssignments[p.id] = {};
  });

  // Process each round's tables
  tables.forEach(roundData => {
    roundData.tables.forEach((table, tableIndex) => {
      table.forEach(participant => {
        const companions = table
          .filter(p => p.id !== participant.id)
          .map(p => p.name);
        
        if (participantAssignments[participant.id]) {
          participantAssignments[participant.id][roundData.round] = {
            table: tableIndex + 1,
            companions
          };
        }
      });
    });
  });

  // Create data for Excel
  const data = participants.map(participant => {
    const row: Record<string, string | number> = {
      "Nombre": participant.name,
      "Email": participant.email || "",
      "Teléfono": participant.phone || "",
      "Género": participant.gender || "",
      "Rango de Edad": participant.age_range || "",
    };

    // Add columns for each round
    tables.forEach(roundData => {
      const assignment = participantAssignments[participant.id]?.[roundData.round];
      if (assignment) {
        row[`Ronda ${roundData.round} - Mesa`] = assignment.table;
        row[`Ronda ${roundData.round} - Compañeros`] = assignment.companions.join(", ");
      } else {
        row[`Ronda ${roundData.round} - Mesa`] = "-";
        row[`Ronda ${roundData.round} - Compañeros`] = "-";
      }
    });

    return row;
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Asignaciones");

  // Auto-size columns
  const baseColWidths = [
    { wch: 25 }, // Nombre
    { wch: 30 }, // Email
    { wch: 15 }, // Teléfono
    { wch: 12 }, // Género
    { wch: 15 }, // Rango de Edad
  ];

  // Add column widths for each round (2 columns per round)
  tables.forEach(() => {
    baseColWidths.push({ wch: 12 }); // Mesa
    baseColWidths.push({ wch: 40 }); // Compañeros
  });

  ws["!cols"] = baseColWidths;

  XLSX.writeFile(wb, `mesas-${eventName.toLowerCase().replace(/\s+/g, "-")}.xlsx`);
};
