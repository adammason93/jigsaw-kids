# Deploying

Merging to `main` is what publishes the site. Cloudflare Workers Builds deploys that branch to the `jigsaw-kids` worker, which serves https://wondii.co.uk.

Any other branch that is pushed gets a preview, not production:

`https://<branch>-jigsaw-kids.adammason93.workers.dev`

A slash in the branch name becomes a hyphen, so `feature/hello` is `https://feature-hello-jigsaw-kids.adammason93.workers.dev`.

Never run `wrangler deploy` by hand from a laptop or from another branch. That is a second publish path, and it can overwrite what `main` just shipped. GitHub Actions does not publish the site either.

Supabase is separate. Edge functions and database migrations are deployed by the founder. Merging the site does not publish them.
