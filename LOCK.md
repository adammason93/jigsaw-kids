# Story builder lock — 19 October 2026

This tag is the working story builder. Do not move it. Do not change Book V2 generation, illustration handling, character consistency, bookshelf saving, or the 3D reader unless that change is explicitly authorised.

## What is locked

A parent approves Create My Book once. Book V2 version 90 runs one step, then stops and waits. While the creation page stays open, the page sends that same Continue request once for the finished step. The Continue button is still there and uses the same request. Refreshing the page does not send the same finished step again. The sequence stops when the book is saved, when a step needs an adult, when the budget is reached, or when a result is uncertain.

Scheduled wakes do not continue a book. Automatic generation is off, so an empty scheduled wake returns HTTP 403 with reason `automatic-generation-off` before any book work.

The per-book budget stays $1.20. A paid book still needs the existing authenticated adult approval. The browser cannot set the budget.

## Live versions

| Piece | Version |
| --- | --- |
| Book V2 function | 90, active, JWT verification off |
| Automatic generation | off |
| Website worker | f137068d-ccf9-46a4-9bdd-0a3b0c9768cf |
| Creation page script | story-journey.js?v=50 |
| Progress script | book-v2-progress.js?v=8 |
| Workshop script | book-workshop.js?v=4 |
| 3D reader | book.js?v=75 |

The files in this tag are the bytes that were live when the lock was made. `SHA256SUMS` is the checksum list. The reader checksum is `29206a19ed646409cfd7b81842a5e1569c196385bbf197a3fb1e1ae05a673121`.

## Regression test

`node tests/book-continue-button.test.mjs` must pass before a future change to the creation page. It passed on 19 October 2026 against the locked `story-journey.js` and `book-v2-progress.js`. The test uses mocked progress only. It does not call a model.

## Rollback

To remove only the automatic Continue click, roll the website worker back to `cc37b6ec-d500-4680-bd7c-185e63d2a9e6`. Leave the reader where it is. Worker `55acf64f-de6e-46f4-bac5-40688023041c` is an older reader deploy, so it is not the way to undo the button.

To restore this generator, redeploy the `function/` directory in this tag. That source is Book V2 version 90. It does not use `begin_book_operation`.

The database column `generation` and the function `begin_book_operation` can stay. This locked generator does not call them. Do not drop them to undo a later experiment.

Automatic generation stays off. Turning it on is a separate decision.
