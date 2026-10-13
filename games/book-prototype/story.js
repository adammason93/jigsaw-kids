/* Sample book for the isolated reader. Words follow the approved Maya plates.
   The star in those pictures is told as a star-shaped golden key.
   This file does not call an image provider. */
(function (root) {
  "use strict";

  var ART = "/docs/agent/book-v2/visual-proof/e/images/";

  var limits = [
    "These plates are the approved Maya proof for “A Blink for the Sky”. They are temporary stand-ins, not new golden-key illustrations.",
    "There is no ancient oak, no castle, and no second child. Leo is not in these plates, so he is not in this sample.",
    "The pictured light is a star. The story calls it a star-shaped golden key so the words match the art. A separate key object does not exist yet.",
    "The storyboard girl with a rabbit is not a Wondii character and is not used.",
    "A future illustration pass needs a location bible: the same oak, the same key, the same castle, Maya’s approved identity, a clear gutter on panoramic art, and a text-safe region for each layout."
  ];

  function plate(file, alt, position) {
    return { src: ART + file, alt: alt, position: position || "center center" };
  }

  var endpaper = { id: "endpaper", layout: "endpaper", label: "Endpaper" };

  var title = {
    id: "title",
    layout: "title",
    label: "Title page",
    image: plate("cover.jpg", "Maya in her yellow cardigan, holding a small glowing star in a night garden.", "center 70%")
  };

  var pages = [
    {
      id: "p1",
      pageNo: 1,
      layout: "full",
      textSafe: "bottom",
      image: plate("p1.jpg", "Maya crouches beside a clay flowerpot at sunset, looking at a small light under the rim.", "center 30%"),
      paragraphs: [
        "Maya knelt by the old clay pot. A small gold light blinked under the rim, then hid when she looked up."
      ]
    },
    {
      id: "p2",
      pageNo: 2,
      layout: "above",
      image: plate("p2.jpg", "Maya holds out an open hand toward a tiny star tucked under the flowerpot.", "center center"),
      paragraphs: [
        "She held out one open hand.",
        "“I will not grab,” she whispered. “You can come out if you want to.”"
      ]
    },
    {
      id: "p3",
      pageNo: 3,
      layout: "above",
      image: plate("p3.jpg", "Maya watches the little star-shaped light beside the flowerpot.", "center center"),
      paragraphs: [
        "The light climbed onto her palm. It was a tiny golden key, shaped like a star.",
        "“Oh,” said Maya. “You were tucked under the pot.”"
      ]
    },
    {
      id: "p5",
      pageNo: 4,
      layout: "beside",
      textSide: "left",
      image: plate("p5.jpg", "Maya stands by the garden wall with the glowing star resting in her hands.", "68% center"),
      paragraphs: [
        "“Where do you belong?” she asked.",
        "The key blinked twice. The garden wall hid almost all of the sky."
      ]
    },
    {
      id: "p6",
      pageNo: 5,
      layout: "beside",
      textSide: "right",
      image: plate("p6.jpg", "Maya lifts the star toward the tall garden wall while the sky stays mostly hidden.", "left center"),
      paragraphs: [
        "She lifted the key as high as she could.",
        "“Is anyone there?” Only the wall answered, with a long quiet shadow."
      ]
    },
    {
      id: "p4",
      pageNo: 6,
      layout: "above",
      image: plate("p4.jpg", "Maya cups the glowing star in both hands beside the flowerpot.", "center center"),
      paragraphs: [
        "She cupped her hands. The key unfolded and blinked once against her fingers.",
        "Maya blinked back, very slowly."
      ]
    },
    {
      id: "garden",
      pageNo: "7–8",
      layout: "panorama",
      image: plate("p8.jpg", "Maya carries the glowing star into the open garden, with a wide evening sky behind the wall.", "left center"),
      paragraphs: [
        "Maya carried the key into the open garden. The wall stayed behind them. Above the grass, the sky was wide enough for a secret to be heard."
      ]
    },
    {
      id: "p7",
      pageNo: 9,
      layout: "above",
      image: plate("p7.jpg", "Maya holds the star close, near the garden wall that still hides part of the sky.", "center center"),
      paragraphs: [
        "The key tucked its points against her thumb.",
        "“Are you frightened?” Maya asked. “I am a little frightened too.”"
      ]
    },
    {
      id: "p9",
      pageNo: 10,
      layout: "above",
      image: plate("p9.jpg", "Maya holds the star under a wider sky while distant lights begin to answer.", "center center"),
      paragraphs: [
        "She held still. The key tried two small blinks.",
        "Far above the trees, two stars blinked back."
      ]
    },
    {
      id: "p10",
      pageNo: 11,
      layout: "full",
      textSafe: "top",
      image: plate("p10.jpg", "Maya opens her hands as the star rises into the night sky, leaving a thin trail of light.", "center 60%"),
      paragraphs: [
        "Maya opened her hands. The golden key rose, leaving a thin trail of light. The two stars blinked again, and the key blinked with them."
      ]
    },
    {
      id: "p11",
      pageNo: 12,
      layout: "above",
      final: true,
      image: plate("p11.jpg", "Maya looks up with empty hands while one bright star shines above the garden.", "center 20%"),
      paragraphs: [
        "Her hands were empty. She opened them once more, just to be sure.",
        "One star blinked above her yellow sleeves. The secret was not to hold on. It was to let the key find the sky."
      ]
    }
  ];

  function storyPages() {
    return pages.filter(function (page) { return page.layout !== "panorama"; }).length + 2;
  }

  root.WondiiBookSample = {
    title: "The Secret of the Golden Key",
    author: "Wondii",
    limits: limits,
    endpaper: endpaper,
    titlePage: title,
    pages: pages,
    storyPageCount: 12
  };
})(typeof window !== "undefined" ? window : globalThis);
