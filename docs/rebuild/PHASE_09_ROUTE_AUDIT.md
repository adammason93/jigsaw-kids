# Phase 9 route audit

Traced from the current source. Destinations are what the code does now, after this phase.

| Source | URL | Query | Expected context | Actual context | Destination | Legacy or current |
| --- | --- | --- | --- | --- | --- | --- |
| Portal Create | `schools/learn/create.html` | none | School account, then a class choice | Creator waits for the organisation and the account scope, then the V2 home | Creator V2 | Current |
| Class → Create Adventure | `schools/learn/create.html` | `class=<id>` | That class, its year, and every pupil | `setClass` loads the class from the account-scoped class book. All pupils start selected | Creator V2 class step | Current |
| Class → Quick Game | `schools/learn/create.html` | `quick=1&class=<id>` | Class already chosen | Picker for Quiz, Spin a pupil, or Word Search. Electricity is not this route | Quick picker, then attendance | Current |
| Portal Quick Game | same | `quick=1` and the class when the teacher has one class | Class if known | Same picker | Quick picker | Current |
| Old Quick Game bookmark | `present.html` | `example=lights&class=` | Must not pretend to be a saved adventure | Redirects to `create.html?quick=1` and keeps `class` | Quick picker | Current redirect |
| Electricity sample | `create.html` | `example=lights` or `template` | Demo text only | Creator opens the sample electricity text on the class step | Demo, not Quick Game | Demo |
| Library | `create.html` | `library=1` | Saved adventures for this organisation | Current cards and older cards are separate | Creator library | Current |
| Start a current adventure | `create.html` | `start=<id>&class=` | Saved class, activities, play mode | Loads that adventure and opens attendance. Does not ask for teams again | Attendance, then confirm | Current |
| Missing adventure | `create.html` | `start=<id>` when it is not on this account | A clear failure | Notice: this adventure could not be opened on this account. No substitute lesson | Creator home | Current |
| Older adventure start | `create.html` | `start=<id>` when `creator` is not `v2` or a mechanic is unsupported | Do not enter the player | Library notice. Update makes a new copy | Update copy | Current guard |
| Adapt or update | `create.html` | `adapt=<id>` | A new draft. Original unchanged | New id. Unsupported activities are left out of the copy and named in a notice | Activities step | Current |
| Preview | `present.html` | `journey=<id>&preview=1` | No session write | Lesson shell stage | Preview | Current |
| Journey without preview | `present.html` | `journey=<id>` | Not the player | Redirects to `create.html?start=` | Attendance for a current adventure | Current |
| Bare present | `present.html` | none, or `class` only | Not the old roster | Short “Choose an adventure” link back to create | Create | Current |
| Live session | `present.html` | `session=<code>&class=` | That session | Lesson shell. `fresh=1` skips the resume prompt. Resume omits `fresh` | Lesson shell | Current |
| Teacher Home continue | `portal.html` | home | An open session if one exists | `Continue lesson` links to `present.html?session=<code>`. A saved adventure with no session is `Start adventure` | Session or creator start | Current |
| Class continue | `class.html` | classroom tab | Same rule | Continue lesson uses the session code. Otherwise Start adventure | Session or creator start | Current |
| Results row | `portal.html#results` | — | That session | Each row links to `present.html?session=<code>` | That session | Current |
| `present.html?edit=1` | present | `edit=1` | Old question form | Still handled in `present.js`. No current page links to it | Legacy form | Legacy, unlinked |
| Mechanics fixture | `present.html` | `example=mechanics` | In-memory electricity fixture | Still a demo | Fixture | Demo |
| `flow.js` / `create.js` | not loaded | — | Old creator strings | No HTML script tag loads them | Unreachable from current pages | Legacy files kept |

The sentence “This adventure is not ready to open” is not in this repository. The start failures that were in the code were: the creator painting before the school account was ready, a missing adventure opening a blank draft, and `present.html` with no session showing the old roster.
