/* Listed prices for the models Book V2 already calls.
   Checked 15 Oct 2026: gpt-6.1-sol text $2 in / $10 out per 1M,
   gpt-4o-mini $0.15 in / $0.60 out per 1M,
   gpt-image-2.5-sunburst text in $5, image in $8, image out $30 per 1M.
   This file does not call a model. A bound is not an invoice cap. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WondiiBookV2Cost = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var TEXT = { input: 2, output: 10, cachedInput: 0.1 };
  var VISION = { input: 0.15, output: 0.6 };
  var IMAGE = { textInput: 5, imageInput: 8, imageOutput: 30 };
  /* Settled edits at 1536x1024 medium billed 1536 image tokens per reference
     and 343 output tokens. The bounds sit above those bills. */
  var IMAGE_INPUT_OBSERVED = 1536;
  var IMAGE_OUTPUT_OBSERVED = 343;
  var IMAGE_TEXT_OBSERVED = 800;
  var IMAGE_INPUT_BOUND = 2048;
  var IMAGE_OUTPUT_BOUND = 512;
  var IMAGE_TEXT_BOUND = 1200;
  var VISION_IMAGE_TOKENS = 2833;
  var VISION_TEXT_BOUND = 800;
  var VISION_OUTPUT_BOUND = 700;
  var VISION_EXPECTED_USD = 0.00062;
  /* Measured book-bible $0.052166 plus book-prose $0.013684. */
  var STORY_EXPECTED_USD = 0.06585;
  var MAX_BUDGET_USD = 8;
  var STORY_UPPER = [
    { input: 2475, output: 8000, times: 1 },
    { input: 6475, output: 8000, times: 2 },
    { input: 2334, output: 6000, times: 1 },
    { input: 5000, output: 6000, times: 2 }
  ];

  function money(usd) {
    var value = Number(usd);
    if (!isFinite(value) || value < 0) return 0;
    return Math.round(value * 1000000) / 1000000;
  }

  function charsOf(brief) {
    if (!brief) return 0;
    if (typeof brief === "string") return brief.length;
    return String(brief.system || "").length + String(brief.user || "").length;
  }

  function tokensFromChars(chars) {
    return Math.ceil(Math.max(0, Number(chars) || 0) / 3);
  }

  function textBound(brief, maxOutputTokens) {
    var input = tokensFromChars(charsOf(brief));
    var output = Number(maxOutputTokens) || 8000;
    return money((input * TEXT.input + output * TEXT.output) / 1e6);
  }

  function imageAmount(textTokens, referenceCount, outputTokens, inputPerRef) {
    var refs = Math.max(0, Number(referenceCount) || 0);
    return money((textTokens * IMAGE.textInput + refs * inputPerRef * IMAGE.imageInput + outputTokens * IMAGE.imageOutput) / 1e6);
  }

  function imageBound(prompt, referenceCount) {
    var text = Math.max(IMAGE_TEXT_BOUND, tokensFromChars(String(prompt || "").length));
    return imageAmount(text, referenceCount, IMAGE_OUTPUT_BOUND, IMAGE_INPUT_BOUND);
  }

  function imageExpected(referenceCount) {
    return imageAmount(IMAGE_TEXT_OBSERVED, referenceCount, IMAGE_OUTPUT_OBSERVED, IMAGE_INPUT_OBSERVED);
  }

  function visionBound() {
    return money(((VISION_IMAGE_TOKENS + VISION_TEXT_BOUND) * VISION.input + VISION_OUTPUT_BOUND * VISION.output) / 1e6);
  }

  function storyUpper() {
    return money(STORY_UPPER.reduce(function (sum, call) {
      return sum + ((call.input * TEXT.input + call.output * TEXT.output) / 1e6) * call.times;
    }, 0));
  }

  function settleText(usage, fallbackUsd) {
    var fallback = money(fallbackUsd);
    if (!usage) return fallback;
    var prompt = Number(usage.prompt_tokens) || 0;
    var output = Number(usage.completion_tokens) || 0;
    if (prompt + output <= 0) return fallback;
    var details = usage.prompt_tokens_details || {};
    var cached = Math.min(prompt, Number(details.cached_tokens) || 0);
    return money(((prompt - cached) * TEXT.input + cached * TEXT.cachedInput + output * TEXT.output) / 1e6);
  }

  function settleImage(usage, fallbackUsd) {
    var fallback = money(fallbackUsd);
    if (!usage) return fallback;
    var details = usage.input_tokens_details || {};
    var textIn = details.text_tokens != null ? Number(details.text_tokens) || 0 : Number(usage.input_tokens) || 0;
    var imageIn = Number(details.image_tokens) || 0;
    var output = Number(usage.output_tokens) || 0;
    if (textIn + imageIn + output <= 0) return fallback;
    return money((textIn * IMAGE.textInput + imageIn * IMAGE.imageInput + output * IMAGE.imageOutput) / 1e6);
  }

  function settleVision(usage, fallbackUsd) {
    return settleText(usage, fallbackUsd);
  }

  function settle(kind, usage, fallbackUsd) {
    if (kind === "image") return settleImage(usage, fallbackUsd);
    if (kind === "vision") return settleVision(usage, fallbackUsd);
    return settleText(usage, fallbackUsd);
  }

  function usageSummary(usage) {
    var source = usage || {};
    var details = source.input_tokens_details || source.prompt_tokens_details || {};
    return {
      promptTokens: Number(source.prompt_tokens) || 0,
      completionTokens: Number(source.completion_tokens) || 0,
      inputTokens: Number(source.input_tokens) || 0,
      outputTokens: Number(source.output_tokens) || 0,
      textTokens: Number(details.text_tokens) || 0,
      imageTokens: Number(details.image_tokens) || 0,
      cachedTokens: Number(details.cached_tokens) || 0
    };
  }

  /* Twelve interior pictures. One repair is one extra picture and one extra check.
     The provider does not enforce this figure on the invoice. */
  function quoteBook(characters, pages) {
    var cast = Math.max(0, Number(characters) || 0);
    var count = Number(pages) || 12;
    var picture = imageExpected(cast);
    var pictureBound = imageBound("", cast);
    var check = VISION_EXPECTED_USD;
    var checkBound = visionBound();
    var expected = money(STORY_EXPECTED_USD + picture * count + check * count);
    var upper = money(storyUpper() + pictureBound * (count + 1) + checkBound * (count + 1));
    return {
      characters: cast,
      pages: count,
      expectedUsd: expected,
      upperUsd: upper,
      repairUsd: money(picture + check),
      repairUpperUsd: money(pictureBound + checkBound),
      storyExpectedUsd: STORY_EXPECTED_USD,
      storyUpperUsd: storyUpper(),
      pictureExpectedUsd: picture,
      pictureUpperUsd: pictureBound,
      providerInvoiceCap: false
    };
  }

  return {
    TEXT: TEXT,
    VISION: VISION,
    IMAGE: IMAGE,
    IMAGE_INPUT_OBSERVED: IMAGE_INPUT_OBSERVED,
    IMAGE_OUTPUT_OBSERVED: IMAGE_OUTPUT_OBSERVED,
    IMAGE_INPUT_BOUND: IMAGE_INPUT_BOUND,
    IMAGE_OUTPUT_BOUND: IMAGE_OUTPUT_BOUND,
    MAX_BUDGET_USD: MAX_BUDGET_USD,
    STORY_EXPECTED_USD: STORY_EXPECTED_USD,
    money: money,
    textBound: textBound,
    imageBound: imageBound,
    imageExpected: imageExpected,
    visionBound: visionBound,
    storyUpper: storyUpper,
    settle: settle,
    usageSummary: usageSummary,
    quoteBook: quoteBook
  };
});
