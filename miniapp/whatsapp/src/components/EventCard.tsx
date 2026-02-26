import type { EventResult } from "../api/types";

interface EventCardProps {
  event: EventResult;
  onClick: () => void;
}

export function EventCard({ event, onClick }: EventCardProps) {
  const date = new Date(event.startTime).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="event-card" onClick={onClick}>
      {event.coverUrl && (
        <img
          src={event.coverUrl}
          alt=""
          className="event-card-image"
          loading="lazy"
        />
      )}
      <div className="event-card-body">
        <h3 className="event-card-title">{event.title}</h3>
        <p className="event-card-meta">{date}</p>
        {event.locationName && (
          <p className="event-card-meta">{event.locationName}</p>
        )}
        <div className="event-card-tags">
          {event.isFree && <span className="tag tag-free">Free</span>}
          {event.categories?.slice(0, 2).map((c) => (
            <span key={c} className="tag">{c}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
