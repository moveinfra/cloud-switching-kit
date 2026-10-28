// Builds the switching notice from the form fields. Plain text so it pastes into a support case or an email.
import { NO_SWITCHING_CHARGES_FROM } from './core.js';

const PROVIDERS = {
  aws: { name: 'Amazon Web Services', program: 'your program for free data transfer out when moving off AWS, or the AWS EU Data Act Addendum' },
  azure: { name: 'Microsoft Azure', program: 'your free data transfer out offer for customers leaving Azure' },
  gcp: { name: 'Google Cloud', program: 'your free data transfer program for customers exiting Google Cloud' },
  other: { name: '', program: '' },
};

const v = (s, placeholder) => (s && String(s).trim()) || `[${placeholder}]`;

export function switchingNotice(f) {
  const p = PROVIDERS[f.provider] ?? PROVIDERS.other;
  const provider = f.provider === 'other' ? v(f.providerName, 'provider name') : p.name;
  const today = f.today ?? new Date().toISOString().slice(0, 10);
  const scope = f.scope === 'all'
    ? 'all our services, data and digital assets'
    : `the following services and all their data and digital assets: ${v(f.services, 'list of services')}`;
  const destination = f.destination === 'onprem' ? 'our own infrastructure' : `another provider${f.destinationName ? ` (${f.destinationName.trim()})` : ''}`;
  const free = (f.startDate || today) >= NO_SWITCHING_CHARGES_FROM;

  const charges = free
    ? 'Please confirm that no switching charges will apply, including data egress charges for the switch. Under Article 29(1), from 12 January 2027 providers may not impose switching charges.'
    : 'Please tell us, itemised and before we begin, any switching charges that would apply, including data egress charges for the switch. Under Article 29, until 12 January 2027 such charges may not exceed the costs directly linked to the switching process, and from 12 January 2027 they may not be charged at all.';

  const asks = [
    'Confirm receipt of this notice and the date on which the switching process starts. We understand that the notice period may not exceed two months, followed by a transitional period of up to 30 calendar days in which you continue to provide the services and support the switch (Article 25).',
    'Provide the exhaustive specification of the data and digital assets that can be exported, including metadata, and the export formats and interfaces available (Article 25 and Article 26).',
    charges,
  ];
  if (p.program) asks.push(`Apply ${p.program} to the data transfer for this move, and tell us anything you need from us for that.`);
  asks.push(
    'Keep our data available for retrieval for at least 30 calendar days after the transitional period. After that period, erase all exportable data and digital assets and confirm the erasure to us in writing (Article 25).',
    'Name a contact person for this switch.',
  );

  const lines = [
    `Subject: Notice of switching under the EU Data Act (Regulation (EU) 2023/2854)${f.accounts ? ` - ${f.accounts.trim()}` : ''}`,
    '',
    `To: ${provider}`,
    `From: ${v(f.company, 'company name')}, ${v(f.address, 'registered address')}`,
    `Account(s): ${v(f.accounts, 'account, subscription or billing IDs')}`,
    `Date: ${today}`,
    '',
    'Dear Sir or Madam,',
    '',
    `We hereby give notice that we wish to switch ${scope} from ${provider} to ${destination}, in accordance with Chapter VI (Articles 23 to 31) of Regulation (EU) 2023/2854 (the Data Act) and our agreement with you.`,
    '',
    'Please:',
    '',
    ...asks.map((a, i) => `${i + 1}. ${a}`),
    '',
  ];
  if (f.startDate || f.tb) {
    lines.push(`We plan to start the data transfer on ${v(f.startDate, 'date')}${f.tb ? ` and expect to move about ${f.tb} TB` : ''}.`, '');
  }
  lines.push(
    `Please reply to ${v(f.contactName, 'contact name')}, ${v(f.contactEmail, 'email')}.`,
    '',
    'Kind regards,',
    '',
    v(f.contactName, 'name'),
    v(f.company, 'company name'),
  );
  return lines.join('\n');
}
