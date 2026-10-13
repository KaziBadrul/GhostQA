import { startOrderFixture } from '../fixtures/api/order-lifecycle';
// Explicit local, disposable development target. Neutral contract is the same in both variants.
const fixture = await startOrderFixture(process.argv.includes('--fixed'), 4010);
console.log('Example Orders API: ' + fixture.url + '/api');
console.log(
  'Import examples/orders.openapi.json in GhostQA. Use the Orders setup presets.',
);
console.log(
  process.argv.includes('--fixed')
    ? 'Repaired example behavior.'
    : 'Intentionally faulty demonstration target; do not use real data.',
);
process.once('SIGINT', () => void fixture.close());
process.once('SIGTERM', () => void fixture.close());
