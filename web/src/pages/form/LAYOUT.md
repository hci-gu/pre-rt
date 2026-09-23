# Questionnaire layout contract

The questionnaire uses one visible question and native scrolling, not a
viewport-sized slide carousel. Swiping/wheeling long content must never change
the question. Navigation buttons, answer auto-advance, and the question menu
continue to control the active question. React Hook Form retains unmounted
questions' answers.

Multiple choice, open text, numeric answers, and single-choice questions with
typed amounts also have a “Gå vidare” button below the white answer card, on the
page background. It uses the same navigation eligibility as the footer arrows
and occupies its own row within measured content, never overlaying the card.
Normal single-choice, pain-scale, and date answers still auto-advance.

`questionnaire-shell` is a three-row grid: header, `minmax(0, 1fr)` content, and
footer. Its single column is also `minmax(0, 1fr)` so enlarged text cannot force
the grid wider than the screen. Controls participate in layout rather than
overlaying answer choices; the footer wraps if necessary. Safe-area insets are
reserved. `useVisualViewport` supplies the available height/width and offsets,
including keyboard resizing and mobile browser panning. Its CSS variables also
constrain portaled question/help dialogs.

Header/footer controls have their own stacking layer above the clipped question
area. Rich text has paint containment, so positioned content cannot escape its
text area and cover help, answer, or navigation controls. Action buttons grow
with wrapped labels; adaptive padding and the quick-exit label also accommodate
enlarged text. Question/help dialogs reserve a separate, non-scrolling row for
their close button; even the dialog title is inside the bounded scrolling body.
The question menu also has a left-aligned “Lämna formuläret” action in that row.
It navigates back one history entry without clearing the saved draft.

`AdaptiveQuestionPanel` measures the rendered content against the available
space, trying comfortable, compact, then tight typography and spacing. When
there is enough readable column width, ordinary choice lists are also measured
in two columns, preserving row-major option order. The grid is used only if it
fits or improves the minimum layout without forcing words to break; inline
follow-up groups remain stacked. It remeasures after viewport/content resizes
and font loading. It does not guess
from character counts, question IDs, or a fixed number of options.

On small screens, if the tight layout still does not fit, it tries typography at
93.75%, then 87.5%, remeasuring both column layouts before allowing overflow.
At the default text setting, answer labels therefore step from 16px to 15px to
14px. The floor is `.875rem`, so enlarged text settings still scale it up.
Larger screens retain the `1rem` floor. Text/number inputs stay at `1rem` and
touch targets remain at least 44 CSS pixels. Text wraps, including long unbroken
words and numeric-option labels.
There is deliberately no transform-based scaling or maximum option count.
When the minimum readable layout is still too tall, the bounded question panel
scrolls. No finite viewport can show arbitrary amounts of content simultaneously
at a readable size; reachability through native scrolling is the safety invariant.
Without ResizeObserver, resize events and native scrolling remain available.
While a questionnaire is mounted, document scrolling is locked and restored on
exit. Only the bounded question panel scrolls; an open modal uses its own body
while the underlying questionnaire is inert, not nested scrolling areas.

Intro, information sections, input questions, submission, and success use the
same panel. The quick-exit eligibility rules are unchanged, but its control and
attribution now occupy footer space rather than overlapping the question.

## Browser regression checks

Start Vite on `127.0.0.1:4173`, then use Playwright CLI:

```sh
npx --package @playwright/cli playwright-cli --session layout open http://127.0.0.1:4173
npx --package @playwright/cli playwright-cli --session layout run-code --filename scripts/check-questionnaire-layout.js
npx --package @playwright/cli playwright-cli --session layout run-code --filename scripts/check-questionnaire-interactions.js
npx --package @playwright/cli playwright-cli --session layout run-code --filename scripts/check-questionnaire-controls.js
npx --package @playwright/cli playwright-cli --session layout run-code --filename scripts/check-questionnaire-continue.js
npx --package @playwright/cli playwright-cli --session layout close
```

The first script covers 135 layouts: all question types, 4/7/8/12 choices, long
labels, follow-up options, number placeholders, long sections, rich HTML,
landscape, a keyboard-sized viewport, and 200% text size. It checks geometry,
minimum answer sizing, reachability, and that scrolling does not navigate.
It also asserts that small-screen scrolling is used only after the 14px step,
that input text is not reduced, and that there are no nested scrolling areas.
It can also run in WebKit (`open --browser webkit --mobile`).

The second script uses Chromium native touch input and checks selection of the
last option, rotation, focused numeric input after viewport shrink, help,
navigation, answer retention, submission, and the success page.

The controls script adds 120 button hit/visibility checks, including long help
titles, dismissal after scrolling, positioned rich text, quick exit, a
keyboard-sized viewport, landscape, and 200% text. It runs in Chromium and
WebKit and clicks the close buttons after scrolling (not just Escape).
It also checks that leaving the form returns to the previous page without
changing the saved draft.

The continue script exercises manual advancement for multiple choice, optional
text, numeric answers, and typed amounts on four constrained viewports. It
checks button reachability and separation from the white card, disabled state,
retained answers, and that regular
single-choice/date answers still auto-advance without submitting the form.

All scripts mock API responses and never write participant data. Run the
existing `pnpm test` and `pnpm build` as well. Physical iOS/Android keyboard and
browser-chrome behavior should additionally be checked on real devices before
release; desktop viewport emulation is not a substitute for that hardware test.
