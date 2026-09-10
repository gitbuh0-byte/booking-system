// Two half-open ranges [aStart, aEnd) and [bStart, bEnd) overlap iff
// aStart < bEnd AND aEnd > bStart. We use that here to find any existing
// booking on the same resource that overlaps the proposed new range.
//
// This runs as a pre-check so the API can return a clean 409 with a helpful
// message. The database's exclusion constraint (see migrations/001_init.sql)
// is the real safety net against race conditions between two concurrent
// requests that both pass this check at the same instant.
export async function findConflict(client, { resourceId, seatNumber, startsAt, endsAt, excludeId = null }) {
  const params = [resourceId, seatNumber, startsAt, endsAt];
  let query = `
    SELECT id, resource_id AS bus_id, seat_number, starts_at, ends_at, booked_by
    FROM bookings
    WHERE resource_id = $1
      AND seat_number = $2
      AND starts_at < $4
      AND ends_at > $3
  `;

  if (excludeId !== null) {
    params.push(excludeId);
    query += ` AND id != $${params.length}`;
  }

  query += ' LIMIT 1';

  const { rows } = await client.query(query, params);
  return rows[0] ?? null;
}
