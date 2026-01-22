/**
 * B2B Table Generator
 * Generates 1:1 meeting tables for Professional Networking events
 * Supports fixed client or fixed provider rotation modes
 */

export interface ProfessionalParticipant {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company_name?: string | null;
  entity_type?: "client" | "provider" | null;
  sector?: string | null;
  company_size?: string | null;
  needs?: string[] | null;
  solutions?: string[] | null;
  business_interests?: string[] | null;
  checked_in?: boolean;
  global_participant_id?: string | null;
}

export interface B2BMeeting {
  tableNumber: number;
  client: ProfessionalParticipant;
  provider: ProfessionalParticipant;
}

export interface B2BRound {
  round: number;
  meetings: B2BMeeting[];
  unassigned: ProfessionalParticipant[];
}

export interface B2BTableResult {
  rounds: B2BRound[];
  warnings: string[];
  stats: {
    totalClients: number;
    totalProviders: number;
    meetingsPerRound: number;
    totalMeetings: number;
  };
}

export type RotationType = "client_fixed" | "provider_fixed";

/**
 * Generates B2B 1:1 meeting tables with rotation
 * @param participants All checked-in participants
 * @param numberOfRounds Number of rounds to generate
 * @param rotationType Which entity type stays fixed at tables
 * @param previousEncounters Map of participant pairs who have met before
 */
export function generateB2BTables(
  participants: ProfessionalParticipant[],
  numberOfRounds: number,
  rotationType: RotationType,
  previousEncounters: Map<string, Set<string>> = new Map()
): B2BTableResult {
  const warnings: string[] = [];

  // Separate clients and providers
  const clients = participants.filter(p => p.entity_type === "client");
  const providers = participants.filter(p => p.entity_type === "provider");

  // Validate we have both types
  if (clients.length === 0) {
    warnings.push("No hay clientes registrados para el evento");
    return { rounds: [], warnings, stats: { totalClients: 0, totalProviders: providers.length, meetingsPerRound: 0, totalMeetings: 0 } };
  }
  if (providers.length === 0) {
    warnings.push("No hay proveedores registrados para el evento");
    return { rounds: [], warnings, stats: { totalClients: clients.length, totalProviders: 0, meetingsPerRound: 0, totalMeetings: 0 } };
  }

  // Determine fixed and rotating groups based on rotation type
  const fixedGroup = rotationType === "client_fixed" ? clients : providers;
  const rotatingGroup = rotationType === "client_fixed" ? providers : clients;

  // Calculate meetings per round (limited by smaller group)
  const meetingsPerRound = Math.min(fixedGroup.length, rotatingGroup.length);
  
  if (fixedGroup.length !== rotatingGroup.length) {
    const larger = fixedGroup.length > rotatingGroup.length ? 
      (rotationType === "client_fixed" ? "clientes" : "proveedores") :
      (rotationType === "client_fixed" ? "proveedores" : "clientes");
    warnings.push(`Hay más ${larger} que parejas disponibles. Algunos no tendrán reunión en cada ronda.`);
  }

  // Generate rounds using rotation algorithm
  const rounds: B2BRound[] = [];
  const usedPairings = new Map<string, Set<string>>();

  // Initialize usedPairings with previous encounters
  previousEncounters.forEach((encounters, participantId) => {
    usedPairings.set(participantId, new Set(encounters));
  });

  for (let roundNum = 1; roundNum <= numberOfRounds; roundNum++) {
    const round = generateSingleRound(
      fixedGroup,
      rotatingGroup,
      rotationType,
      roundNum,
      usedPairings,
      warnings
    );
    rounds.push(round);

    // Record all pairings from this round to avoid repeats
    round.meetings.forEach(meeting => {
      // Track from client's perspective
      if (!usedPairings.has(meeting.client.id)) {
        usedPairings.set(meeting.client.id, new Set());
      }
      usedPairings.get(meeting.client.id)!.add(meeting.provider.id);

      // Track from provider's perspective
      if (!usedPairings.has(meeting.provider.id)) {
        usedPairings.set(meeting.provider.id, new Set());
      }
      usedPairings.get(meeting.provider.id)!.add(meeting.client.id);
    });
  }

  const totalMeetings = rounds.reduce((sum, r) => sum + r.meetings.length, 0);

  return {
    rounds,
    warnings,
    stats: {
      totalClients: clients.length,
      totalProviders: providers.length,
      meetingsPerRound,
      totalMeetings,
    },
  };
}

/**
 * Generates a single round of meetings
 */
function generateSingleRound(
  fixedGroup: ProfessionalParticipant[],
  rotatingGroup: ProfessionalParticipant[],
  rotationType: RotationType,
  roundNumber: number,
  usedPairings: Map<string, Set<string>>,
  warnings: string[]
): B2BRound {
  const meetings: B2BMeeting[] = [];
  const assignedFixed = new Set<string>();
  const assignedRotating = new Set<string>();

  // Create a shuffled copy of rotating group for variety
  const shuffledRotating = [...rotatingGroup].sort(() => Math.random() - 0.5);

  // For each fixed participant, find a rotating partner
  for (let tableNum = 0; tableNum < fixedGroup.length; tableNum++) {
    const fixed = fixedGroup[tableNum];
    
    // Find best available rotating partner (prefer those not met before)
    let bestPartner: ProfessionalParticipant | null = null;
    let bestScore = -1;

    for (const rotating of shuffledRotating) {
      if (assignedRotating.has(rotating.id)) continue;

      const hasMet = usedPairings.get(fixed.id)?.has(rotating.id) || 
                     usedPairings.get(rotating.id)?.has(fixed.id);
      
      // Score: prefer new pairings (1) over repeat pairings (0)
      const score = hasMet ? 0 : 1;

      if (score > bestScore) {
        bestScore = score;
        bestPartner = rotating;
        if (score === 1) break; // Perfect match found
      }
    }

    if (bestPartner) {
      assignedFixed.add(fixed.id);
      assignedRotating.add(bestPartner.id);

      const client = rotationType === "client_fixed" ? fixed : bestPartner;
      const provider = rotationType === "client_fixed" ? bestPartner : fixed;

      meetings.push({
        tableNumber: tableNum + 1,
        client,
        provider,
      });

      if (bestScore === 0) {
        warnings.push(`Ronda ${roundNumber}, Mesa ${tableNum + 1}: ${client.name} y ${provider.name} se repiten por falta de opciones`);
      }
    }
  }

  // Find unassigned participants
  const unassignedFixed = fixedGroup.filter(p => !assignedFixed.has(p.id));
  const unassignedRotating = rotatingGroup.filter(p => !assignedRotating.has(p.id));
  const unassigned = [...unassignedFixed, ...unassignedRotating];

  return {
    round: roundNumber,
    meetings,
    unassigned,
  };
}

/**
 * Converts B2B table result to the standard table format used by EventDetail
 * This allows reuse of existing table display components
 */
export function b2bToStandardTableFormat(
  b2bResult: B2BTableResult
): { round: number; tables: { id: string; name: string }[][] }[] {
  return b2bResult.rounds.map(round => ({
    round: round.round,
    tables: round.meetings.map(meeting => [
      { id: meeting.client.id, name: meeting.client.name },
      { id: meeting.provider.id, name: meeting.provider.name },
    ]),
  }));
}

/**
 * Validates participant data for B2B event
 * Returns warnings about missing entity types
 */
export function validateB2BParticipants(
  participants: ProfessionalParticipant[]
): { valid: boolean; warnings: string[]; clients: number; providers: number; unclassified: number } {
  const clients = participants.filter(p => p.entity_type === "client").length;
  const providers = participants.filter(p => p.entity_type === "provider").length;
  const unclassified = participants.filter(p => !p.entity_type).length;

  const warnings: string[] = [];
  
  if (unclassified > 0) {
    warnings.push(`${unclassified} participante(s) sin tipo de entidad asignado`);
  }
  if (clients === 0) {
    warnings.push("No hay clientes registrados");
  }
  if (providers === 0) {
    warnings.push("No hay proveedores registrados");
  }

  return {
    valid: clients > 0 && providers > 0 && unclassified === 0,
    warnings,
    clients,
    providers,
    unclassified,
  };
}
