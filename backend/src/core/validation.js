import { invalid } from './errors.js';

export function object(value, field = 'body') {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    invalid(field, 'Must be a JSON object.');
  }
  return value;
}

export function onlyKeys(value, keys, field = 'body') {
  object(value, field);
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) invalid(`${field}.${key}`, 'Unknown field.');
  }
}

export function string(value, field, min = 1, max = 128) {
  if (typeof value !== 'string' || value.length < min || value.length > max) {
    invalid(field, `Must be a string containing ${min} to ${max} characters.`);
  }
  return value;
}

export function choice(value, field, values) {
  if (!values.includes(value)) invalid(field, `Must be one of: ${values.join(', ')}.`);
  return value;
}

export function wholeNumber(value, field, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    invalid(field, `Must be an integer between ${min} and ${max}.`);
  }
  return value;
}

export function queryInteger(value, field, fallback, min, max) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) invalid(field, 'Must be an integer.');
  return wholeNumber(Number(value), field, min, max);
}

export function credentials(body, registration = false) {
  onlyKeys(body, registration ? ['username', 'password', 'confirmPassword'] : ['username', 'password']);
  const username = string(body.username, 'username', 3, 30).trim();
  if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) {
    invalid('username', 'Use 3 to 30 ASCII letters, digits, or underscores.');
  }
  const password = string(body.password, 'password', registration ? 8 : 1, 128);
  if (registration && body.confirmPassword !== password) {
    invalid('confirmPassword', 'Must match password.');
  }
  return { username, password };
}

export function playerName(body) {
  onlyKeys(body, ['username']);
  const username = string(body.username, 'username', 1, 128).normalize('NFC').trim().replace(/ +/g, ' ');
  if ([...username].length < 2 || [...username].length > 30 || !/^[\p{L}\p{N}][\p{L}\p{N} _.-]*$/u.test(username)) {
    invalid('username', 'Use 2 to 30 letters, digits, spaces, underscores, dots, or hyphens. Start with a letter or digit.');
  }
  return username;
}
