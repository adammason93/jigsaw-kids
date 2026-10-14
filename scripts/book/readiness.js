"use strict";

/* Connects the existing Book V2 writer, illustration plan, reference check,
   save, and reader handoff. A model function has to be supplied.
   This file does not read an API key, call a model, or draw a picture. */

var fs = require("fs");
var path = require("path");
var Adapter = require("../../js/book-v2-adapter.js");
var Writer = require("./writer.js");
var Visual = require("../../js/book-visual.js");
var Identity = require("../../js/book-v2-identity.js");
var Cast = require("../../js/book-cast.js");
var Shelf = require("../../js/book-v2-shelf.js");

var ROOT = path.join(__dirname, "..", "..");

function storyRows(bible) {
  return (bible && bible.storyCast || []).map(function (row) {
    var appearance = [row.face, row.colouring, row.markings, row.covering].filter(Boolean).join(". ");
    return {
      id: row.characterId,
      name: row.name,
      appearance: appearance,
      clothing: (row.accessories || []).join(", ")
    };
  }).filter(function (row) { return row.id && row.appearance; });
}

function fileAccess(file, privateArt) {
  if (!file) return { ok: false, reason: "missing", file: "" };
  if (/^https?:/i.test(file) || file.indexOf("data:") === 0) {
    return { ok: false, reason: "not-a-server-file", file: file };
  }
  if (privateArt) return { ok: false, reason: "private-not-fetched", file: file };
  var abs = path.isAbsolute(file) ? file : path.join(ROOT, file);
  if (!fs.existsSync(abs)) return { ok: false, reason: "missing", file: file };
  var size = fs.statSync(abs).size;
  return { ok: size > 0, reason: size > 0 ? "readable" : "missing", file: file, bytes: size };
}

function rehearse(body, ports) {
  var planned = Adapter.planRequest(body || {});
  if (!planned.ok) {
    return Promise.resolve({
      ok: false,
      stage: "plan",
      generated: false,
      imageCalls: 0,
      problems: planned.problems || [],
      message: planned.message || "The story plan could not start. Nothing was saved."
    });
  }
  if (!ports || typeof ports.callModel !== "function") {
    return Promise.resolve({
      ok: false,
      stage: "writer",
      generated: false,
      imageCalls: 0,
      problems: ["model-not-supplied"],
      message: "The story model was not called."
    });
  }
  var calls = [];
  return Writer.generateBook(planned.request, {
    callModel: function (brief, opts) {
      calls.push({ purpose: opts && opts.purpose, system: brief.system, user: brief.user });
      return ports.callModel(brief, opts);
    },
    model: "mock"
  }).then(function (book) {
    var pages = book.pages || [];
    var withStory = Identity.buildRegistry({
      members: (body && body.members) || [],
      savedReferences: body && body.savedReferences,
      sharedCharacters: body && body.sharedCharacters,
      storyCharacters: storyRows(book.bible),
      pages: pages.map(function (page) {
        return { pageId: page.pageId, charactersPresent: page.charactersPresent || [] };
      })
    });
    var registry = withStory.registry || [];
    Identity.clearCache();
    var viewer = ports.viewer || null;
    var scenes = pages.map(function (page) {
      return Identity.prepareScene(registry, page.charactersPresent || [], viewer);
    });
    var access = [];
    scenes.forEach(function (scene, index) {
      (scene.files || []).forEach(function (file) {
        var entry = registry.filter(function (row) { return row.characterId === file.characterId; })[0] || {};
        access.push(Object.assign({
          pageId: pages[index].pageId,
          characterId: file.characterId
        }, fileAccess(file.file, file.privateArt === true || entry.privateArt === true)));
      });
    });
    var contracts = book.bible && pages.length ? Visual.contractsFor(book.bible, pages, {}) : { spreads: [], visualBible: {} };
    var prompts = (contracts.spreads || []).map(function (spread) {
      var lineup = (contracts.visualBible.bookCast && contracts.visualBible.bookCast.members) || [];
      return {
        pageId: spread.spreadId,
        charactersPresent: (spread.charactersPresent || []).slice(),
        prompt: Visual.spreadPrompt(book.bible, spread, lineup),
        repairPrompt: Visual.repairPrompt(book.bible, spread, lineup)
      };
    });
    var bookCast = book.bible ? Cast.compileBookCast(book.bible, pages) : { ok: false, ready: false, problems: [], members: [] };
    var textReady = book.status === "REVIEWABLE" && !(book.textProblems || []).length && !(book.storyProblems || []).length;
    var pictured = null;
    var refused = null;
    var duplicate = null;
    if (ports.store && ports.allowance && ports.owner) {
      var bare = Object.assign({}, book, { illustrationStyle: planned.illustrationStyle || "wondii-picture-book" });
      refused = Shelf.commitBook({
        result: bare,
        owner: ports.owner,
        creationKey: body.creationKey
      }, { store: ports.store, allowance: ports.allowance });
      if (textReady && ports.mockImages) {
        pictured = Shelf.commitBook({
          result: Object.assign({}, bare, {
            pages: pages.map(function (page) {
              return Object.assign({}, page, { imageUrlFallback: ports.mockImages(page) });
            })
          }),
          owner: ports.owner,
          creationKey: body.creationKey
        }, { store: ports.store, allowance: ports.allowance });
        if (pictured && pictured.ok) {
          duplicate = Shelf.commitBook({
            result: bare,
            owner: ports.owner,
            creationKey: body.creationKey
          }, { store: ports.store, allowance: ports.allowance });
        }
      }
    }
    var savedBook = pictured && pictured.book;
    var reader = null;
    if (savedBook) {
      require("../../games/book-prototype/book-data.js");
      reader = global.WondiiBookData.plan(savedBook);
    }
    return {
      ok: textReady,
      stage: textReady ? "ready-for-review" : "validation",
      generated: false,
      mockedModel: true,
      imageCalls: book.imageCalls || 0,
      imageDraws: book.imageDraws || 0,
      status: book.status,
      title: book.bible && book.bible.title,
      pageCount: pages.length,
      locations: (book.bible && book.bible.locations || []).map(function (place) { return place.locationId; }),
      castIds: (book.bible && book.bible.castIds) || [],
      storyCast: (book.bible && book.bible.storyCast || []).map(function (row) { return row.characterId; }),
      storyProblems: book.storyProblems || [],
      planProblems: book.planProblems || [],
      textProblems: book.textProblems || [],
      writerCalls: calls,
      modelCalls: book.modelCalls,
      scenes: scenes,
      access: access,
      prompts: prompts,
      bookCast: {
        ready: bookCast.ready === true,
        problems: bookCast.problems || [],
        references: (bookCast.members || []).map(function (member) {
          return {
            characterId: member.characterId,
            file: (member.referenceAssetIds || [])[0] || "",
            ready: member.reference ? member.reference.ready === true : false
          };
        })
      },
      registryOk: withStory.ok === true,
      registryProblems: withStory.problems || [],
      saveRefused: refused,
      save: pictured,
      duplicate: duplicate,
      reader: reader,
      consistencyPromised: false
    };
  });
}

module.exports = { rehearse: rehearse };
