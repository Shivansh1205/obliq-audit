import type { AuditAction } from "@/lib/generated/prisma/enums";

const ACTION_TEXT: Record<AuditAction, string> = {
  UPLOADED: "uploaded",
  REVIEW_STARTED: "started reviewing",
  CORRECTION_REQUESTED: "requested correction",
  APPROVED: "approved",
  REUPLOADED: "uploaded a revised",
};

type Event = {
  id: string;
  action: AuditAction;
  reason: string | null;
  createdAt: Date;
  actor: { name: string };
};

export function Timeline({ events, documentName }: { events: Event[]; documentName: string }) {
  if (events.length === 0) {
    return <p className="muted">No activity yet.</p>;
  }

  return (
    <ol className="timeline">
      {events.map((event) => (
        <li key={event.id}>
          <time className="muted">
            {event.createdAt.toLocaleString(undefined, {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
          <p>
            <strong>{event.actor.name}</strong> {ACTION_TEXT[event.action]}{" "}
            {event.action === "CORRECTION_REQUESTED" ? "" : documentName}
          </p>
          {event.reason && <p className="reason">Reason: {event.reason}</p>}
        </li>
      ))}
    </ol>
  );
}
