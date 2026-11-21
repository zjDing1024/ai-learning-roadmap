'use strict';

const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');

const digest = (path) =>
  createHash('sha256').update(readFileSync(path)).digest('hex');

const setting = 'query parser';
const cases = [
  { alias: 'express4', version: '4.21.2', expectedDefault: 'extended', override: 'simple' },
  { alias: 'express5', version: '5.1.0', expectedDefault: 'simple', override: 'extended' },
];

const results = cases.map(({ alias, version, expectedDefault, override }) => {
  const express = require(alias);
  assert.equal(require(alias + '/package.json').version, version);
  const first = express();
  const independentBefore = express();
  const defaultBefore = first.get(setting);
  assert.equal(defaultBefore, expectedDefault);
  assert.equal(independentBefore.get(setting), expectedDefault);

  first.set(setting, override);
  const overridden = first.get(setting);
  const otherInstanceAfterOverride = independentBefore.get(setting);
  const freshInstanceAfterOverride = express().get(setting);
  assert.equal(overridden, override);
  assert.equal(otherInstanceAfterOverride, expectedDefault);
  assert.equal(freshInstanceAfterOverride, expectedDefault);

  return {
    version, defaultBefore, overridden,
    otherInstanceAfterOverride, freshInstanceAfterOverride,
    applicationSourceSha256: digest(require.resolve(alias + '/lib/application.js')),
  };
});

process.stdout.write(JSON.stringify({
  node: process.version,
  packageLockSha256: digest(require.resolve('./package-lock.json')),
  cases: results,
}, null, 2) + '\n');
