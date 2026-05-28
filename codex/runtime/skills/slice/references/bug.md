
<instructions>

Bug cards have two goals, in order:

1. **Reproduce** — reach a commit that demonstrates the bug's expected-vs-actual gap on a named surface. The demonstration is an automated check in whatever form the surface supports: a unit or integration test, a script that exits non-zero, a recorded fixture, a snapshot that diverges. "Sometimes" and "intermittent" describe the race the demonstration must force, not a reason to skip this step.
2. **Resolve** — reach a commit that makes the demonstration pass without loosening its assertions.

How many slices it takes to get to each of those commits is a judgment call. A trivial bug may reach both commits in one slice each; a subtle one may need several slices of scaffolding before the demonstration is in place. What matters is that the two commits exist and are ordered: reproduction before resolution.

If the demonstration cannot be committed in a passing state — because the slice validation gate requires it — capture it in a form the gate accepts (a disabled/skipped test, a fixture file, a script not yet wired to CI) and have the resolution slice activate it. The principle is that the reproduction is recorded in the repository before the fix, not that the build is red between commits.

Read `./slice.md` and follow its instructions. Brief the reproduce slice(s) with the demonstration target; brief the resolve slice(s) with the activation step plus the production-code change that makes the demonstration pass.

</instructions>
