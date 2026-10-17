# Test-driven development

Read this file when the user chose **Test-first** in SKILL.md step 3. For **Minimal** or **Tests at seams**, read only "What a good test is" and "Anti-patterns".

TDD is the red-green loop. This file makes the loop produce tests that are worth keeping. Use every section in every cycle, not after the loop.

Read `CONTEXT.md` and ADRs in the touched area when they exist. Use their domain words in test names.

## What a good test is

A good test checks behavior through a public interface. It does not check implementation details. The code can change completely and the test stays the same. A good test name reads like a specification: "user can checkout with valid cart".

Examples: [tests.md](tests.md). Mocks: [mocking.md](mocking.md).

## Seams: where tests go

A seam is the public boundary where you observe behavior without access to internals. Put tests only at seams.

Test only at agreed seams. In dev-flow the plan names the seams, so plan approval is seam approval. Do not ask again. A seam that is not in the plan needs one question to the user before you write a test for it. The floor test from SKILL.md step 3 needs no question.

## Anti-patterns

- **Implementation-coupled**: the test mocks internal collaborators, tests private methods, or checks a side channel (a database query instead of the interface). Sign: the test breaks after a refactor that did not change behavior.
- **Tautological**: the assertion calculates the expected value the same way as the code (`expect(add(a, b)).toBe(a + b)`). The test cannot fail. Take expected values from an independent source: a literal, a worked example, the spec.
- **Horizontal slicing**: all tests first, then all code. These tests check imagined behavior and the shape of things. Use vertical slices: one test, one implementation, then repeat. Each test responds to what the last cycle showed.

## Rules of the loop

1. Write the failing test. Run it. Make sure that it fails for the expected reason.
2. Write only enough code to pass the test. Do not add code for future tests.
3. Do one seam, one test and one implementation per cycle.
4. Do not refactor in the loop. Refactor after the loop, and run the tests again.
