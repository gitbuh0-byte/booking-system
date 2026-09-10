import test from 'node:test';
import assert from 'node:assert/strict';
import { findConflict } from '../src/lib/conflictCheck.js';

function mockClient(rows) {
  let queryText;
  let queryParams;

  return {
    query(text, params) {
      queryText = text;
      queryParams = params;
      return Promise.resolve({ rows });
    },
    get queryText() {
      return queryText;
    },
    get queryParams() {
      return queryParams;
    },
  };
}

test('findConflict uses half-open overlap boundaries', async () => {
  const client = mockClient([{ id: 7, booked_by: 'Sam' }]);

  const result = await findConflict(client, {
    resourceId: 'bus-101',
    seatNumber: '7',
    startsAt: '2026-09-10T10:00:00.000Z',
    endsAt: '2026-09-10T11:00:00.000Z',
  });

  assert.deepEqual(result, { id: 7, booked_by: 'Sam' });
  assert.match(client.queryText, /seat_number = \$2/);
  assert.match(client.queryText, /starts_at < \$4/);
  assert.match(client.queryText, /ends_at > \$3/);
  assert.deepEqual(client.queryParams, [
    'bus-101',
    '7',
    '2026-09-10T10:00:00.000Z',
    '2026-09-10T11:00:00.000Z',
  ]);
});

test('findConflict returns null when the database finds no overlap', async () => {
  const client = mockClient([]);

  const result = await findConflict(client, {
    resourceId: 'bus-101',
    seatNumber: '7',
    startsAt: '2026-09-10T11:00:00.000Z',
    endsAt: '2026-09-10T12:00:00.000Z',
  });

  assert.equal(result, null);
});

test('findConflict can exclude a booking during future edits', async () => {
  const client = mockClient([]);

  await findConflict(client, {
    resourceId: 'bus-101',
    seatNumber: '7',
    startsAt: '2026-09-10T10:00:00.000Z',
    endsAt: '2026-09-10T11:00:00.000Z',
    excludeId: 7,
  });

  assert.match(client.queryText, /id != \$5/);
  assert.deepEqual(client.queryParams.at(-1), 7);
});