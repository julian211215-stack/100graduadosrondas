
export type ParticipantStatus = "waiting" | "available" | "competing" | "advanced" | "eliminated" | "finalist";
export type ParticipantMode = "participant" | "voter";

export interface Participant {
  id: string;
  name: string;
  generationId: string;
  photoUrl: string;
  mode: ParticipantMode;
  status: ParticipantStatus;
  label?: string; // Etiqueta manual (R1, R2, Activo, etc.)
  currentMatchId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Dynamic {
  id: string;
  name: string;
  instructions: string;
  durationSeconds: number | null;
  votingCriteria: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RoundStatus = "pending" | "active" | "completed";

export interface Round {
  id: string;
  roundNumber: number;
  status: RoundStatus;
  matchIds: string[];
  byeParticipantId?: string;
  createdAt: string;
  completedAt?: string;
}

export type MatchStatus = "pending" | "live" | "voting" | "completed";

export interface Match {
  id: string;
  roundId: string;
  participantAId: string;
  participantBId: string;
  dynamicId: string;
  status: MatchStatus;
  winnerId?: string;
  loserId?: string;
  createdAt: string;
  completedAt?: string;
}

export interface Vote {
  id: string;
  matchId: string;
  voterId: string;
  selectedParticipantId: string;
  createdAt: string;
}

export interface AppSettings {
  eventName: string;
  finalistsCount: number;
  registrationOpen: boolean;
  currentStatus: "idle" | "registration" | "sorting" | "dueling" | "results" | "finished";
  currentRoundId?: string;
  activeMatchId?: string;
  updatedAt?: string;
}
