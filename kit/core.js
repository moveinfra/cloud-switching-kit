// Pure calculations for the switching kit: egress cost, transfer time, exit programs and the EU Data Act.
// No DOM, no network: used by the page and by the tests.

/** From this date the EU Data Act (Art. 29) allows no switching charges, including egress for the switch. */
export const NO_SWITCHING_CHARGES_FROM = '2027-01-12';

const GIB = 1024 ** 3;

/**
 * List-price cost of sending `gb` (decimal GB) to the internet, spread evenly over `months`.
 * Tiers apply to traffic above the monthly free allowance; both reset every month.
 */
export function egressCost(egress, gb, months = 1) {
  const perMonth = (gb * (egress.unit === 'GiB' ? 1e9 / GIB : 1)) / months;
  const billable = Math.max(0, perMonth - (egress.freeGBPerMonth ?? 0));
  let monthly = 0;
  for (const t of egress.tiers) {
    const hi = t.toGB ?? Infinity;
    if (billable > t.fromGB) monthly += (Math.min(billable, hi) - t.fromGB) * t.perGB;
  }
  return { cost: monthly * months, currency: egress.currency };
}

/** Days to copy `tb` terabytes over a `gbps` link at the given efficiency (protocol overhead, contention). */
export function transferDays(tb, gbps, efficiency = 0.7) {
  if (!(gbps > 0)) return Infinity;
  return (tb * 8e12) / (gbps * 1e9 * efficiency) / 86400;
}

/**
 * What a provider's own exit program offers for this move.
 * scope: 'all' = leaving the provider, 'service' = all data of some services, 'part' = part of a service or parallel use.
 */
export function exitProgram(provider, scope, euCustomer) {
  const p = {
    aws: {
      name: 'AWS free data transfer out for customers moving off AWS',
      eligible: scope !== 'part',
      steps: euCustomer
        ? ['EU customers switching under the Data Act: ask AWS Support for switching under the AWS EU Data Act Addendum.',
           'Otherwise: ask AWS Support for free data transfer out under the program, then move within the agreed window.']
        : ['Ask AWS Support for free data transfer out under the program.', 'Customers outside the EU have 180 days to complete the move.'],
      why: scope === 'part'
        ? 'The program covers moving all your data off AWS, or all data of one AWS service. Moving part of a service does not qualify.'
        : 'You do not need to close your AWS account.',
    },
    azure: {
      name: 'Azure free data transfer out when leaving Azure',
      eligible: scope === 'all',
      steps: ['Open an Azure Support request with your subscription or enrollment ID, planned start date and data volume.',
        'Move the data within 60 days of the start date (ask for longer in the first request if needed).',
        'Cancel all Azure subscriptions of the account, then request the invoice-level credit.'],
      why: scope === 'all'
        ? 'The credit covers at most 60 days of egress charges and needs all subscriptions cancelled.'
        : 'The credit requires leaving Azure and cancelling all subscriptions; moving some services does not qualify (UK customers have a separate 180-day, per-service option).',
    },
    gcp: {
      name: 'Google Cloud free data transfer when exiting',
      eligible: scope !== 'part',
      steps: ['Submit the Exit Notice form; a Billing Support contact is assigned within 14 days.',
        'Start within the 30-day initiation period; migrate during the migration period (at least 30 days, can be extended).',
        'Submit the Completion Notice; the agreement for the service is then terminated.'],
      why: scope === 'part'
        ? (euCustomer
          ? 'The exit program needs the whole service and its termination. For partial or multi-cloud moves, EU customers can use Data Transfer Essentials, initially offered at no charge.'
          : 'The exit program needs the whole service and its termination; partial moves do not qualify.')
        : 'You must terminate your agreement for the services you move.',
    },
  }[provider];
  return p;
}

/** What the EU Data Act says about charges for this move. `date` is the planned move date (YYYY-MM-DD). */
export function dataAct(euCustomer, scope, date) {
  if (!euCustomer) {
    return { applies: false, text: 'The EU Data Act protects customers in the EU. Outside the EU, the provider program and your contract apply.' };
  }
  if (scope === 'part') {
    return {
      applies: true, free: false,
      text: 'Keeping workloads running on both clouds is "in-parallel use" (Art. 34): the provider may charge for data egress, but not more than its costs. Switching charges rules (Art. 29) apply only when you switch.',
    };
  }
  if (date >= NO_SWITCHING_CHARGES_FROM) {
    return {
      applies: true, free: true,
      text: 'From 12 January 2027 providers may not charge you for switching, including data egress for the switch (Art. 29(1)).',
    };
  }
  return {
    applies: true, free: false,
    text: 'Until 12 January 2027 switching charges, including egress for the switch, may not exceed the provider\'s direct costs (Art. 29). Ask for them to be itemised; from 12 January 2027 they must be zero.',
  };
}

/** Everything the calculator shows for one input. */
export function assess(data, { provider, tb, months, gbps, scope, euCustomer, date }) {
  const p = data.providers[provider];
  const list = egressCost(p.egress, tb * 1000, months);
  const toEur = list.currency === 'USD' ? 1 / data.usdPerEur : 1;
  return {
    providerName: p.name,
    list: { ...list, eur: list.cost * toEur },
    days: transferDays(tb, gbps),
    program: { ...exitProgram(provider, scope, euCustomer), source: p.exitProgram?.source },
    dataAct: dataAct(euCustomer, scope, date),
    sources: { egress: p.egress.source, checked: data.checked },
  };
}
