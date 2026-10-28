import { test } from 'node:test';
import assert from 'node:assert/strict';
import data from '../data/exit-data.js';
import { egressCost, transferDays, dataAct, exitProgram, assess } from '../kit/core.js';
import { switchingNotice } from '../kit/letter.js';

const close = (a, b) => assert.ok(Math.abs(a - b) < 0.01, `${a} != ${b}`);

test('AWS egress: 100 GB free, then tiers', () => {
  const e = data.providers.aws.egress;
  close(egressCost(e, 100).cost, 0);
  close(egressCost(e, 1100).cost, 1000 * 0.09);
  // 20 TB in one month: 10,240 GB at 0.09, the rest at 0.085
  close(egressCost(e, 20000).cost, 10240 * 0.09 + (19900 - 10240) * 0.085);
});

test('spreading over months uses the allowance every month', () => {
  const e = data.providers.aws.egress;
  close(egressCost(e, 2000, 2).cost, 2 * 900 * 0.09);
});

test('Google Cloud tiers are in GiB', () => {
  const e = data.providers.gcp.egress;
  assert.equal(e.unit, 'GiB');
  close(egressCost(e, 1000).cost, Math.min(1000e9 / 1024 ** 3, 1024) * 0.12);
});

test('transfer time', () => {
  close(transferDays(10, 1, 1), 10 * 8000 / 86400);
  assert.equal(transferDays(1, 0), Infinity);
});

test('Data Act phases', () => {
  assert.equal(dataAct(true, 'all', '2026-11-01').free, false);
  assert.equal(dataAct(true, 'all', '2027-01-12').free, true);
  assert.equal(dataAct(true, 'part', '2027-06-01').free, false);
  assert.equal(dataAct(false, 'all', '2027-06-01').applies, false);
});

test('exit programs', () => {
  assert.equal(exitProgram('aws', 'service', true).eligible, true);
  assert.equal(exitProgram('aws', 'part', true).eligible, false);
  assert.equal(exitProgram('azure', 'service', true).eligible, false);
  assert.equal(exitProgram('azure', 'all', false).eligible, true);
  assert.equal(exitProgram('gcp', 'service', false).eligible, true);
});

test('assess converts USD to EUR', () => {
  const r = assess(data, { provider: 'aws', tb: 1.1, months: 1, gbps: 1, scope: 'all', euCustomer: true, date: '2026-11-01' });
  close(r.list.eur, (1000 * 0.09) / data.usdPerEur);
});

test('switching notice', () => {
  const before = switchingNotice({ provider: 'aws', scope: 'all', company: 'Acme GmbH', startDate: '2026-12-01', today: '2026-10-28' });
  assert.match(before, /Acme GmbH/);
  assert.match(before, /may not exceed the costs directly linked/);
  assert.match(before, /\[registered address\]/);
  const after = switchingNotice({ provider: 'gcp', scope: 'services', services: 'Cloud SQL', startDate: '2027-02-01', today: '2027-01-20' });
  assert.match(after, /no switching charges will apply/);
  assert.match(after, /Cloud SQL/);
  assert.match(after, /exiting Google Cloud/);
});
