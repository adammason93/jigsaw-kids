# Story ownership

This release does not move story storage. The notes below describe the model that is live today, and the model to build later.

## What exists today

A saved story is a file in the private Storage bucket `storybook_room`.

The path is `{user id}/storybook/shelf.json`. `storybookObjectPath` in `js/score-cloud.js` builds that path from the signed-in user id. Row level security allows select, insert, update, and delete only when the first folder equals `auth.uid()` (`20260430120000_storybook_room_rls_split_part.sql`).

That means a story belongs to the person who is signed in. It does not belong to a school, a class, or a workspace.

A teacher who also has a personal workspace still has one shelf. Choosing Personal or the school in the portal does not change which stories load. Two teachers at the same school cannot read each other's shelves. A school admin cannot read another teacher's shelf through this bucket.

`organisation_story_starters` is a different thing. Those rows are short prompts a school admin writes for the school (title, description, and a seed sentence). Active prompts are visible to members of that school. They are not the text of a saved story, and they are not a teacher's private book.

Wondii HQ story figures, where they exist, are counts. They do not return another person's story text.

## What to build later

Keep the current shelf until a story has an explicit owner and an explicit audience. Do not infer a school story from the workspace that happened to be open when it was saved.

Four audiences:

- Personal stories. Owner is the signed-in user. Only that user can read or edit them. This is the current shelf, kept for family accounts and for a teacher's own private making.
- Teacher-private stories. Owner is the teacher. Stored separately from the personal shelf so a school workspace can list them, but readable and editable only by that teacher. Another teacher, including a school admin, does not see the text unless the owner shares it.
- Classroom stories. Owner is still the teacher who created the story. Audience is one class or one live session. Pupils in that class can read it. Teachers outside that class cannot.
- School-library stories. Owner is the organisation. A school admin publishes a story into the school library on purpose. Members of that school can read the published copy. Publishing copies or references the story. It does not leave the teacher's private original open to the rest of the staff.

Sharing is an action with a recorded audience. Opening the school portal is not that action.
