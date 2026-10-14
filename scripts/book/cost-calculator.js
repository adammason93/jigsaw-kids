"use strict";

/* Local cost model for a 12-page Book V2 book. It does not call a provider.
   Prices were read from https://developers.openai.com/api/docs/pricing on 14 Oct 2026.
   Measured totals come from the October proof files. They are not a new quote. */

var MEASURED = {
  textNoRepairUsd: 0.051934,
  textNoRepairCalls: 2,
  textNoRepairPages: 11,
  textOneRepairUsd: 0.13941,
  textOneRepairCalls: 3,
  imageRunUsd: 0.378805,
  imageRunCalls: 10
};

var PRICES = {
  solInputPerMillion: 2,
  solOutputPerMillion: 10,
  lunaInputPerMillion: 0.1,
  lunaOutputPerMillion: 0.5,
  visionInputPerMillion: 0.15,
  visionOutputPerMillion: 0.6,
  imageTextInputPerMillion: 5,
  imageInputPerMillion: 8,
  imageOutputPerMillion: 30,
  miniImageInputPerMillion: 2.5,
  miniImageOutputPerMillion: 8,
  batchFactor: 0.5,
  gbpPerUsd: 0.754,
  extraReferenceCeilingUsd: 8000 * 8 / 1e6
};

function round(value) {
  return Math.round(value * 1000) / 1000;
}

function money(usd, gbpPerUsd) {
  return {
    usd: round(usd),
    gbp: round(usd * gbpPerUsd)
  };
}

function quote(input) {
  var ask = input || {};
  var rate = ask.gbpPerUsd || PRICES.gbpPerUsd;
  var pages = ask.pages || 12;
  var references = ask.references == null ? 2 : ask.references;
  var imageCallUsd = ask.imageCallUsd == null ? MEASURED.imageRunUsd / MEASURED.imageRunCalls : ask.imageCallUsd;
  var extraReferenceUsd = ask.extraReferenceUsd == null ? 0 : ask.extraReferenceUsd;
  var textCallUsd = ask.textCallUsd == null ? MEASURED.textNoRepairUsd / MEASURED.textNoRepairCalls : ask.textCallUsd;
  var textRepairCallUsd = ask.textRepairCallUsd == null ? (MEASURED.textOneRepairUsd - MEASURED.textNoRepairUsd) : ask.textRepairCallUsd;
  var textCalls = ask.textCalls == null ? 2 : ask.textCalls;
  var textRepairCalls = ask.textRepairCalls == null ? 0 : ask.textRepairCalls;
  var pageRepairRate = ask.pageRepairRate == null ? 0 : ask.pageRepairRate;
  var failureRate = ask.failureRate == null ? 0 : ask.failureRate;
  var batch = ask.batch === true;
  var textFactor = ask.textFactor == null ? 1 : ask.textFactor;
  var repairImageFactor = ask.repairImageFactor == null ? (batch ? PRICES.batchFactor : 1) : ask.repairImageFactor;
  var firstImageFactor = batch ? PRICES.batchFactor : 1;
  var visionUsd = ask.visionCallUsd == null ? 0 : ask.visionCallUsd;
  var repairPages = pages * Math.min(1, Math.max(0, pageRepairRate));
  var firstImages = pages;
  var imageUnit = imageCallUsd + Math.max(0, references - 1) * extraReferenceUsd;
  var textUsd = (textCalls * textCallUsd + textRepairCalls * textRepairCallUsd) * textFactor * (batch && ask.batchText !== false ? PRICES.batchFactor : 1);
  var imageUsd = firstImages * imageUnit * firstImageFactor + repairPages * imageUnit * repairImageFactor;
  var visionTotal = (firstImages + repairPages) * visionUsd;
  var attempt = textUsd + imageUsd + visionTotal;
  var wasted = failureRate > 0 && failureRate < 1 ? (failureRate / (1 - failureRate)) * textUsd : 0;
  var completed = failureRate >= 1 ? null : attempt + wasted;
  return {
    textUsd: round(textUsd),
    imageUsd: round(imageUsd),
    visionUsd: round(visionTotal),
    attempt: money(attempt, rate),
    perCompletedBook: completed == null ? null : money(completed, rate),
    imageCalls: round(firstImages + repairPages),
    textCalls: textCalls + textRepairCalls
  };
}

function range(low, high) {
  return { low: low, high: high };
}

function pair(base) {
  var cautious = Object.assign({}, base, { extraReferenceUsd: PRICES.extraReferenceCeilingUsd });
  var optimistic = Object.assign({}, base, { extraReferenceUsd: 0 });
  return range(quote(optimistic), quote(cautious));
}

function scenarios(rate) {
  var gbpPerUsd = rate || PRICES.gbpPerUsd;
  return {
    currentNoRepairs: pair({ gbpPerUsd: gbpPerUsd }),
    currentTypicalRepairs: pair({ gbpPerUsd: gbpPerUsd, textRepairCalls: 1, pageRepairRate: 0.25 }),
    currentMaxRepairs: pair({ gbpPerUsd: gbpPerUsd, textRepairCalls: 6, pageRepairRate: 1 }),
    batchNoRepairs: pair({ gbpPerUsd: gbpPerUsd, batch: true }),
    sixSpreadsSamePrice: pair({ gbpPerUsd: gbpPerUsd, pages: 6 }),
    hybrid: pair({
      gbpPerUsd: gbpPerUsd,
      batch: true,
      batchText: false,
      textFactor: PRICES.lunaOutputPerMillion / PRICES.solOutputPerMillion,
      textRepairCalls: 1,
      repairImageFactor: 1,
      pageRepairRate: 0.25
    })
  };
}

function volumes(perBookGbp) {
  return [100, 1000, 10000].map(function (count) {
    return { books: count, gbp: round(perBookGbp * count) };
  });
}

if (require.main === module) {
  var set = scenarios(PRICES.gbpPerUsd);
  console.log(JSON.stringify({
    exchange: "1 USD = 0.754 GBP, mid-market 14 Oct 2026",
    targetGbp: 0.4,
    measuredImageCallUsd: round(MEASURED.imageRunUsd / MEASURED.imageRunCalls),
    extraReferenceCeilingUsd: round(PRICES.extraReferenceCeilingUsd),
    scenarios: set
  }, null, 2));
}

module.exports = {
  MEASURED: MEASURED,
  PRICES: PRICES,
  quote: quote,
  scenarios: scenarios,
  volumes: volumes
};
