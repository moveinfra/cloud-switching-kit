# Cloud Switching Kit

What leaving **AWS, Azure or Google Cloud** costs in data transfer, how to get that fee waived, what the
**EU Data Act** says about it, and a **switching notice** you can send to your provider.

**Use it:** [moveinfra.eu/cloud-exit-fees/](https://moveinfra.eu/cloud-exit-fees/) or
[moveinfra.github.io/cloud-switching-kit](https://moveinfra.github.io/cloud-switching-kit/). It runs in your browser;
nothing you type is sent anywhere.

## What it tells you

1. **Egress at list price**: internet data transfer out for your volume, with the provider's free allowance and
   tiers, in the provider's currency and in euros.
2. **Copy time**: how long the transfer takes over your link.
3. **The provider's own exit program**: whether your move qualifies for free data transfer, and the steps.

   | | Program | Qualifies when | Window |
   |---|---|---|---|
   | AWS | Free data transfer out when moving off AWS | all data off AWS, or all data of a service; no need to close the account | 180 days outside the EU; EU customers via the EU Data Act Addendum |
   | Azure | Free egress when leaving Azure | you leave Azure and cancel all subscriptions, then claim a credit | 60 days |
   | Google Cloud | Free data transfer when exiting | the whole service moves and its agreement is terminated | 30-day start, then at least 30 days |

   For partial or multi-cloud moves, Google offers EU customers Data Transfer Essentials, initially free.
4. **The EU Data Act** (Regulation (EU) 2023/2854, Chapter VI):
   - until **12 January 2027**, switching charges, including egress for the switch, may not exceed the provider's
     direct costs (Art. 29);
   - from **12 January 2027**, no switching charges at all (Art. 29(1));
   - running on both clouds ("in-parallel use", Art. 34) may still be charged, at cost;
   - the notice period is at most two months, followed by a transitional period of up to 30 days, and your data must
     stay retrievable for at least 30 days after that (Art. 25).

The switching notice puts those rights into a letter: notice of switching, a request for the export specification,
the charges, the exit program, the retrieval period and erasure.
[`templates/switching-notice.md`](templates/switching-notice.md) has the same text for use without the page.

**This is not legal advice.** Check the notice against your contract and the
[text of the Data Act](https://eur-lex.europa.eu/eli/reg/2023/2854/oj).

## Data

Egress tiers and exit program conditions come from the
[EU Cloud Price Index](https://github.com/moveinfra/eu-cloud-prices) (`data/manual.json` there, each value with the
provider page it came from). `npm run update-data` copies them into `data/exit-data.json` and `data/exit-data.js`;
a monthly workflow opens a pull request when they change.

Assumptions: the provider's default network tier (AWS and Azure standard internet egress, Google Premium Tier), the
Frankfurt region, prices without tax, and the move being your only internet egress that month.

## Embedding

The kit is plain ES modules and one stylesheet, scoped under `.mi-kit`, with no dependencies and no build step:

```html
<link rel="stylesheet" href="kit/kit.css">
<div id="kit"></div>
<script type="module">
  import { mount } from './kit/ui.js';
  mount(document.getElementById('kit'));
</script>
```

`kit/core.js` (calculations) and `kit/letter.js` (the notice) have no DOM code and can be used on their own.

## Development

```sh
npm test                                              # node --test, no dependencies
python3 -m http.server                                # then open http://localhost:8000
node scripts/update-data.mjs ../eu-cloud-prices/data/manual.json   # from a local checkout of the index
```

## License

Code: [Apache-2.0](LICENSE). The notice template in `templates/` is CC0: use and change it freely.

Made by [MoveInfra](https://moveinfra.eu/), which moves companies from US clouds to EU-owned ones. AWS, Azure and
Google Cloud are trademarks of their owners; this kit is not affiliated with them.
