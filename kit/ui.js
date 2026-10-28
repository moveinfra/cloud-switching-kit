// mount(element): renders the exit fee calculator and the switching notice generator into element.
// Everything runs in the browser; nothing is sent anywhere.
import defaultData from '../data/exit-data.js';
import { assess, NO_SWITCHING_CHARGES_FROM } from './core.js';
import { switchingNotice } from './letter.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const money = (v, cur) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(v);

function days(d) {
  if (!Number.isFinite(d)) return '–';
  if (d < 1) return `${Math.max(1, Math.round(d * 24))} hours`;
  return `${Math.round(d)} day${Math.round(d) === 1 ? '' : 's'}`;
}

export function mount(el, { data = defaultData } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  el.classList.add('mi-kit');
  el.innerHTML = `
  <section class="mi-kit-card" aria-labelledby="mi-kit-calc">
    <h2 id="mi-kit-calc">Exit fee calculator</h2>
    <form class="mi-kit-form" data-calc>
      <label>Cloud you are leaving
        <select name="provider">
          <option value="aws">AWS</option><option value="azure">Microsoft Azure</option><option value="gcp">Google Cloud</option>
        </select></label>
      <label>Data to move (TB)<input name="tb" type="number" min="0.1" step="0.1" value="20" inputmode="decimal"></label>
      <label>Spread over (months)<input name="months" type="number" min="1" max="12" step="1" value="1"></label>
      <label>Link speed (Gbit/s)<input name="gbps" type="number" min="0.1" step="0.1" value="1" inputmode="decimal"></label>
      <label>What you move
        <select name="scope">
          <option value="all">Everything: we are leaving</option>
          <option value="service">Some services, completely</option>
          <option value="part">Part of a service, or running on both clouds</option>
        </select></label>
      <label>Planned move date<input name="date" type="date" value="${today}"></label>
      <label class="mi-kit-check"><input name="eu" type="checkbox" checked> We are a customer in the EU</label>
    </form>
    <div class="mi-kit-result" data-result aria-live="polite"></div>
  </section>

  <section class="mi-kit-card" aria-labelledby="mi-kit-letter">
    <h2 id="mi-kit-letter">Switching notice</h2>
    <p class="mi-kit-muted">Fill in what you know; the rest stays as [placeholders]. Send it through a support case and to the notice address in your contract.</p>
    <form class="mi-kit-form" data-letter>
      <label>Company<input name="company" autocomplete="organization"></label>
      <label>Registered address<input name="address" autocomplete="street-address"></label>
      <label>Account IDs<input name="accounts" placeholder="account, subscription or billing ID"></label>
      <label>Provider
        <select name="provider">
          <option value="aws">AWS</option><option value="azure">Microsoft Azure</option><option value="gcp">Google Cloud</option><option value="other">Other</option>
        </select></label>
      <label data-other hidden>Provider name<input name="providerName"></label>
      <label>What you switch
        <select name="scope"><option value="all">Everything</option><option value="services">Some services</option></select></label>
      <label data-services hidden>Services<input name="services" placeholder="e.g. Amazon S3, Amazon RDS"></label>
      <label>Moving to
        <select name="destination"><option value="provider">Another provider</option><option value="onprem">Our own infrastructure</option></select></label>
      <label data-dest>Provider (optional)<input name="destinationName" placeholder="e.g. UpCloud"></label>
      <label>Planned start of transfer<input name="startDate" type="date"></label>
      <label>Data volume (TB, optional)<input name="tb" type="number" min="0" step="0.1"></label>
      <label>Contact name<input name="contactName" autocomplete="name"></label>
      <label>Contact email<input name="contactEmail" type="email" autocomplete="email"></label>
    </form>
    <textarea class="mi-kit-letter" data-out rows="18" readonly aria-label="Switching notice text"></textarea>
    <div class="mi-kit-actions">
      <button type="button" data-copy>Copy text</button>
      <button type="button" data-download class="mi-kit-secondary">Download .txt</button>
      <span class="mi-kit-muted" data-copied role="status"></span>
    </div>
    <p class="mi-kit-small">A template, not legal advice. Check it against your contract and the
      <a href="https://eur-lex.europa.eu/eli/reg/2023/2854/oj" rel="noopener">text of the Data Act</a>.</p>
  </section>`;

  const calc = el.querySelector('[data-calc]');
  const result = el.querySelector('[data-result]');
  const letter = el.querySelector('[data-letter]');
  const out = el.querySelector('[data-out]');

  function renderCalc() {
    const f = new FormData(calc);
    const r = assess(data, {
      provider: f.get('provider'), tb: Math.max(0, +f.get('tb') || 0), months: Math.min(12, Math.max(1, Math.round(+f.get('months') || 1))),
      gbps: +f.get('gbps') || 0, scope: f.get('scope'), euCustomer: f.get('eu') === 'on', date: f.get('date') || today,
    });
    const listText = r.list.currency === 'EUR' ? money(r.list.eur, 'EUR') : `${money(r.list.cost, r.list.currency)} <span class="mi-kit-muted">≈ ${money(r.list.eur, 'EUR')}</span>`;
    const scope = f.get('scope');
    const best = r.dataAct.free ? 'Nothing, by law'
      : r.program.eligible ? 'Nothing, with the exit program'
      : r.dataAct.applies ? (scope === 'part' ? 'At most the provider\'s costs' : 'At most direct costs')
      : 'List price';
    result.innerHTML = `
      <div class="mi-kit-figures">
        <div><span class="mi-kit-label">At list price</span><strong>${listText}</strong><span class="mi-kit-muted">internet egress from ${esc(r.providerName)}</span></div>
        <div class="mi-kit-good"><span class="mi-kit-label">What you should pay</span><strong>${esc(best)}</strong><span class="mi-kit-muted">if you follow the steps below</span></div>
        <div><span class="mi-kit-label">Copy time</span><strong>${days(r.days)}</strong><span class="mi-kit-muted">at ${esc(f.get('gbps'))} Gbit/s, 70% efficiency</span></div>
      </div>
      <h3>${r.program.eligible ? '✓' : '✕'} ${esc(r.program.name)}</h3>
      <p>${esc(r.program.why)}</p>
      ${r.program.eligible ? `<ol>${r.program.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}
      ${r.program.source ? `<p class="mi-kit-small"><a href="${esc(r.program.source)}" rel="noopener">Provider's conditions</a></p>` : ''}
      <h3>EU Data Act</h3>
      <p>${esc(r.dataAct.text)}</p>
      <p class="mi-kit-small">Egress list prices from the <a href="https://github.com/moveinfra/eu-cloud-prices" rel="noopener">EU Cloud Price Index</a>, checked ${esc(r.sources.checked)}.
        Prices exclude tax, assume the provider's default network tier and that this move is your only internet egress.</p>`;
  }

  function renderLetter() {
    const f = Object.fromEntries(new FormData(letter));
    el.querySelector('[data-other]').hidden = f.provider !== 'other';
    el.querySelector('[data-services]').hidden = f.scope !== 'services';
    el.querySelector('[data-dest]').hidden = f.destination !== 'provider';
    out.value = switchingNotice({ ...f, scope: f.scope === 'services' ? 'services' : 'all', today });
  }

  calc.addEventListener('input', renderCalc);
  letter.addEventListener('input', renderLetter);
  el.querySelector('[data-copy]').addEventListener('click', async () => {
    const status = el.querySelector('[data-copied]');
    try {
      await navigator.clipboard.writeText(out.value);
      status.textContent = 'Copied';
    } catch {
      out.select();
      status.textContent = 'Select all and copy';
    }
    setTimeout(() => { status.textContent = ''; }, 2500);
  });
  el.querySelector('[data-download]').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([out.value], { type: 'text/plain' }));
    a.download = 'switching-notice.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  renderCalc();
  renderLetter();
}

export { NO_SWITCHING_CHARGES_FROM };
