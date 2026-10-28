# Repository adapter contract

This document specifies backend interfaces only. It does not define or create a database, tables, SQL, or migrations.

`createApp({ repositories })` expects three adapters: `users`, `sessions`, and `scores`. All methods return promises. Returned objects must be detached copies so services cannot mutate stored state.

## Users

- `findByUsername(username)` → user or `null`. Lookup is case insensitive.
- `findById(id)` → user or `null`.
- `create({ username, passwordHash, createdAt })` → newly created user. Enforce username uniqueness atomically, including concurrent registrations. Throw `ApiError(409, 'USERNAME_TAKEN', ...)` on conflicts.

User shape:

```text
{ id, username, passwordHash, createdAt }
```

`id` is an opaque UUID string. `createdAt` is an ISO 8601 UTC string. `passwordHash` is explicitly `null` for the current name-only player flow. Legacy password accounts use the format produced by `core/passwords.js`; preserve that string exactly. Only name-only profiles can be reopened by name without a password. Services expose only public user fields.

Name-only usernames are normalized to Unicode NFC, trimmed, and have repeated ASCII spaces collapsed before reaching the repository. Their display spelling is preserved; lookup and uniqueness remain case insensitive. Concurrent selections of the same name must produce one user identity. Guest play does not create a user or a session: it revokes the previous session and clears its cookie.

## Sessions

- `create({ tokenHash, userId, createdAt, expiresAt })` → no return value required.
- `findActive(tokenHash, now)` → session or `null`. Expiry is exclusive: a session with `expiresAt <= now` is invalid.
- `delete(tokenHash)` → no return value required; missing sessions are harmless.

`now`, `createdAt`, and `expiresAt` are ISO 8601 UTC strings. Only SHA-256 token hashes are stored. Raw cookie tokens never belong in a repository. Expired sessions should be cleaned up.

## Scores

### saveAndUpdateRecord(submission)

Input is a validated, server-calculated object:

```text
{
  userId, runId, mode, rulesVersion, activeDurationMs, endReason,
  foodEaten?, score, scoreBreakdown: { foodScore, timeScore },
  levelResults, fingerprint, createdAt
}
```

`levelResults` stores the full food/time breakdown for each completed Hunt level. `fingerprint` is a SHA-256 hash of normalized results. Negative scores are possible only if the selected time floor policy allows them. Coefficients and score policy are not selected by this document.

Return:

```text
{ run, duplicate, isNewRecord, personalBest }
```

`run` contains the stored submission plus a generated `id`. The service removes internal `userId` and `fingerprint` before returning a run to the client.

Required behavior:

1. Uniqueness is scoped to `(userId, runId)`.
2. Retrying the same fingerprint returns the original run with `duplicate: true`, `isNewRecord: false`, and the current personal best.
3. A different fingerprint for the same identity throws `ApiError(409, 'RUN_ID_CONFLICT', ...)`.
4. Inserting the run and updating the personal record form one atomic operation. A future database adapter must use a transaction and account for concurrent inserts.
5. Replace a personal record only if no record exists or the new score is strictly greater. Equal scores preserve the earlier record.
6. No partial insert may survive a failed record update.

### listRecords(userId)

Return `{ classic: recordOrNull, hunt: recordOrNull }`.

Record shape: `{ userId, mode, score, runId, achievedAt }`.

### listRuns({ userId, mode, page, pageSize })

Return `{ items, total }`. Restrict results to the specified user. `mode` may be undefined. Sort by `createdAt` descending and `id` ascending for a stable tie break. Apply pagination after filtering. `total` is the full filtered count.

### leaderboard({ mode, limit })

Return an array of `{ rank, username, score, achievedAt }`. Include one personal record per user for the specified mode. Sort by score descending, achievedAt ascending, userId ascending. Use consecutive ordinal ranks starting at 1.

The score service reads the first 10 leaderboard entries after a successful save and adds `{ limit: 10, qualified, rank }` to the API response. This describes the player's current personal record, not necessarily the score of a lower-scoring new run. Unqualified runs can remain in personal history while the public Top 10 excludes them.

## Integration point

The current `server.js` uses the default in-memory factory. The database owner can replace it by supplying compatible adapters:

```javascript
const app = createApp({ repositories: yourRepositoryAdapters });
```

When a persistent adapter is connected, update the health response to describe the actual storage and its readiness. The current endpoint deliberately reports `storage: 'memory'` and `databaseConnected: false`.
