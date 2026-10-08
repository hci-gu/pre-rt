# Aina’s app comments — review and decisions

Reviewed: 8 October 2026

Source: [Test av appen - kommentarer Aina.docx.md](</Users/sebastianandreasson/Downloads/Test av appen - kommentarer Aina.docx.md>)

Review basis: all comments and 17 screenshots, current source code, packaged Word content, and the [test app](https://pre-rt.test.appadem.in).

The original findings below are the review snapshot. Items 1–11 were subsequently approved, implemented, and deployed to test on 8 October 2026. User review is pending. Item 12 is deferred per your decision; items 13–18 remain undecided. Keep the item numbers when discussing or implementing decisions.

## How to fill this in

For each item, fill in **Decision** with `Implement`, `Keep as is`, `Defer`, or `Discuss`. Add the desired result and any constraints under **Notes / acceptance criteria**. Suggested priorities are `High`, `Medium`, and `Low`.

The completion checkboxes track implementation and verification, not approval. Leave them unchecked until the agreed work is finished.

## Overall decisions

- Items to tackle first:
- Items to keep as they are:
- Items to defer:
- General design/content preferences:
- Deployment preference for the agreed changes:

Suggested starting order from the review: **#6, #2, #5**, because they directly affect understanding and completing a questionnaire. This is a recommendation only.

## Remaining implementation and design items

### 1. Desktop welcome/login layout

**Comment:** The desktop intro should resemble the mobile version instead of using two columns.

**Status at review — open:** Welcome/login still uses two columns on desktop.

- Decision: yes make it resemble the mobile version
- Notes / acceptance criteria:
  -
- [x] Implemented and verified locally

**Implementation — 8 October 2026:** Welcome and login now use one column at every width, with a shared top logo and bottom footer. Desktop and short-screen login checks passed.

**User review:** Pending.

### 2. Long explanations in “Se alla frågor”

**Comment:** Remove the full explanation text for sections such as “Frågor om våld” from the question list.

**Status at review — open:** Section entries include the entire introduction text instead of just a heading.

- Decision: Yes these long texts should be cut off from this "see alla frågor" list and not show the full section text
- Notes / acceptance criteria:
  -
- [x] Implemented and verified locally

**Implementation — 8 October 2026:** The question menu shows section titles only. Long introductions use a concise “Information” label; their complete text remains available on the information page. Parsing and browser checks passed.

**User review:** Pending.

### 3. Vertical position of the questionnaire panel

**Comment:** The white panel sits too low; reduce the space above it.

**Status at review — still applicable:** The panel is vertically centered. The layout has changed since the screenshots, but shorter questions still leave considerable space above the panel.

- Decision: yes go ahead and clean it up
- Notes / acceptance criteria:
  -
- [x] Implemented and verified locally

**Implementation — 8 October 2026:** Questionnaire panels now align near the top below the header with a small responsive gap. Native scrolling and adaptive sizing remain available; all 135 layout checks passed.

**User review:** Pending.

### 4. Information-section typography and spacing

**Comment:** Use normal-weight explanatory text, consistent uppercase section headings, and more separation between heading and body.

**Status at review — partly fixed:** Sexuality and violence headings are now both uppercase. Body text remains heavy, and spacing relies on inconsistent empty paragraphs in the content.

- Decision: sure go ahead and fix this
- Notes / acceptance criteria:
  -
- [x] Implemented and verified locally

**Implementation — 8 October 2026:** Information sections now have uppercase titles, normal-weight body text, consistent paragraph spacing, and a clear gap below the title. Empty imported paragraphs and whole-paragraph bold/heading formatting are normalized without editing stored questionnaire definitions.

**User review:** Pending.

### 5. Explanation on the final “Skicka in” screen

**Comment:** Add context before submission, either beside the last question or in a white panel explaining that the questionnaire is ready and how to review answers.

**Status at review — partly fixed:** The submit button now has a white panel, but the panel contains only the button. There is no completion summary or guidance about reviewing answers.

Original suggested wording, for editorial review:

> Du har nu svarat på alla frågor och formuläret är klart för att skicka in.
>
> Vill du kolla igenom dina svar eller gå tillbaka till en specifik fråga kan du gå till Se alla frågor eller klicka dig tillbaka via pilarna.

Any approved wording should also make sense when optional questions were skipped.

- Decision: yes add the suggested wording
- Placement and approved wording:
  - have this text above the "skicka in" button inside the box: "Vill du kolla igenom dina svar eller gå tillbaka till en specifik fråga kan du gå till Se alla frågor eller klicka dig tillbaka via pilarna."
- Notes / acceptance criteria:
  -
- [x] Implemented and verified locally

**Implementation — 8 October 2026:** The white submission panel now contains a heading, a completion message that allows for skipped optional questions, and your exact review-guidance sentence above “Skicka in”.

**User review:** Pending.

### 6. Destination and wording after the initial questionnaire

**Comment:** Return to the homepage after the initial questionnaire, with a completion checkmark on its card.

**Status at review — open:** The shared success screen always links to daily check-in and thanks users for reporting their “dagliga användning,” including after the initial questionnaire. The homepage completion checkmark already works.

- Decision: yes fix this
- Priority:
- Desired destination and wording for each questionnaire type:
  - Initial: home page
  - Daily: daily check-in
  - Other: home page
- Notes / acceptance criteria:
  -
- [x] Implemented and verified locally

**Implementation — 8 October 2026:** Initial and other questionnaires return home; the configured daily questionnaire returns to daily check-in. Success wording follows the form type, and the destination survives a page refresh. All three flows passed browser checks. Saving the separate treatment-end date form also returns home, as requested for other forms; its save/edit/retry tests cover that destination.

**User review:** Pending.

### 7. Accordion appearance and arrow size

**Comment:** Answers should visually connect to their question instead of appearing as separate bubbles. Make the arrow larger.

**Status at review — open:** Answers remain separate rounded white boxes with a gap. The arrow remains 16 px.

- Decision: Fix it
- Priority:
- Notes / acceptance criteria:
  - Connected question/answer appearance: see /redesign/screens/faq-vaginal-dilator-how-to-use-video-desktop.png
  - Arrow size/style: see /redesign/screens/faq-vaginal-dilator-how-to-use-video-desktop.png
- [x] Implemented and verified locally

**Implementation — 8 October 2026:** Open accordion items now share one white container, joining the answer to the rounded teal question header. Arrows are 24 px. Desktop/mobile geometry and visual checks passed against the supplied reference.

**User review:** Pending.

### 8. Back buttons at the bottom of subpages

**Comment:** Consider a bottom back button even where breadcrumbs are available.

**Status at review — partly implemented:** “Om du vill veta mer” has one. Ordinary FAQ categories, study information, and after-treatment pages do not.

- Decision: sure add it to all such pages
- Priority:
- Notes / acceptance criteria:
  -
- [x] Implemented and verified locally

**Implementation — 8 October 2026:** A reusable back-link component now appears below the FAQ overview, FAQ categories, all-FAQ page, study information, after-treatment information, daily check-in, calendar history, and profile. Destinations are explicit parent pages.

**User review:** Pending.

### 9. Page-heading sizes

**Comment:** Page headings feel too large.

**Status at review — design decision remains:** The FAQ overview heading is 48 px on desktop; category headings are 36 px.

- Decision: Reduce size
- Priority:
- Preferred sizes or visual reference:
  - lets do 48px -> 36px and 36px -> 24px
- Notes / acceptance criteria:
  -
- [x] Implemented and verified locally

**Implementation — 8 October 2026:** Desktop overview headings are reduced from 48 px to 36 px; category, study, and after-treatment headings are reduced from 36 px to 24 px. Mobile headings stay at or below these sizes.

**User review:** Pending.

### 10. Wrapping on daily-form cards

**Comment:** “Fyll i formulär – annan dag” should fit on one line, potentially with smaller text across this card type.

**Status at review — open:** Confirmed that this title wraps onto two lines on desktop.

- Decision: fix it
- Priority:
- Preferred approach: smaller text, revised wording, wider cards, or allow wrapping:
  - you decide make it work cleanly
- Notes / acceptance criteria:
  -
- [x] Implemented and verified locally

**Implementation — 8 October 2026:** Daily-card titles use 16 px desktop text and more of the available width, with room reserved for completion badges. “Fyll i formulär - annan dag” fits on one line at 640 px and 1280 px viewport widths; mobile text may wrap naturally.

**User review:** Pending.

### 11. Calendar breadcrumbs

**Comment:** The calendar lacks breadcrumbs and shows only “Start.”

**Status at review — partly fixed:** There are breadcrumbs inside the page, but the shared header still says only “Start.” The two should form one consistent navigation path.

- Decision: fix it
- Priority:
- Desired breadcrumb path:
  -
- Notes / acceptance criteria:
  -
- [x] Implemented and verified locally

**Implementation — 8 October 2026:** Calendar history now has one shared breadcrumb path: Start → Dagligt formulär → Tidigare dagar. The duplicate in-page trail was removed; a bottom link returns to daily check-in.

**User review:** Pending.

### 12. Timeline on the after-treatment page

**Comment:** Show the timeline again after treatment, potentially greying out earlier stages and emphasizing the final stage.

**Current status — open:** The page now has continued-use instructions and follow-up information, but no timeline or version with earlier stages greyed out.

Related decisions: #16 and #18.

- Decision: leave for now
- Implementation status: Deferred. No timeline changes made in this batch.
- Priority:
- Timeline content, audience, and visual treatment:
  -
- Notes / acceptance criteria:
  -
- [ ] Implemented and verified

## Product and editorial decisions

### 13. Purpose of “Registrera dig”

**Comment:** The card looks clickable. Is it needed, and should it be checked before registration is actually complete?

**Current status — decision needed:** It is not clickable. Its checkmark depends on a recorded treatment-start date, rather than a distinct registration-completed state. Decide whether to keep, rename, remove, or link this card, and what completion means.

- Decision:
- Priority:
- Card label, destination, and completion rule:
  -
- Notes / acceptance criteria:
  -
- [ ] Agreed outcome implemented and verified, if applicable

### 14. Numbering homepage steps

**Comment:** Consider “1. Registrera dig,” “2. Inledande frågeformulär,” etc.

**Current status — optional proposal:** No numbering exists.

- Decision:
- Priority:
- Which cards to number, and in what order:
  -
- Notes / acceptance criteria:
  -
- [ ] Agreed outcome implemented and verified, if applicable

### 15. Completeness of study information

**Comment:** The answers seem short. Is all the previous information included?

**Current status — editorial review needed:** The current page matches the latest packaged Word content. This does not establish that everything remembered from an older version should still be included. A historical reference or an agreed content list is needed to settle that question.

- Decision:
- Priority:
- Authoritative reference / text to retain or add:
  -
- Notes / acceptance criteria:
  -
- [ ] Content decision resolved and any agreed changes verified

### 16. Timeline audiences and placement

**Comment:** Should everyone see the timeline, regardless of study group?

**Current status — content decision needed:** “Information om studien” has no timeline. The vaginal-dilator timing answer has a PRE-specific timeline; POST has separate text instructions. Showing a timeline to everyone needs an explicit content decision. Group-specific behavior was inspected in the code and packaged content; the live review used the existing test account.

- Decision:
- Priority:
- PRE content and placement:
  -
- POST content and placement:
  -
- Notes / acceptance criteria:
  -
- [ ] Content decision resolved and any agreed changes verified

### 17. Shortening FAQ text

**Comment:** Decide whether to shorten the texts.

**Current status — editorial decision needed:** The current Word content is imported. No further shortening is implied by this review.

- Decision:
- Priority:
- Sections to revise / approved replacement wording:
  -
- Notes / acceptance criteria:
  -
- [ ] Content decision resolved and any agreed changes verified

### 18. Purpose and name of the after-treatment page

**Comment:** Consider replacing “Efter strålbehandlingen” with “Mer information,” collecting links about cancer, radiation, side effects, vaginal dilators, and related support.

**Current status — optional proposal:** The page is now populated, so the empty-page complaint is outdated. Renaming it or adding a broader collection of external resources remains a decision.

Related decisions: #12 and #16.

- Decision:
- Priority:
- Page name and intended purpose:
  -
- Content and links to include:
  -
- Notes / acceptance criteria:
  -
- [ ] Agreed outcome implemented and verified, if applicable

## Comments already addressed

These can remain closed unless you want a different result. Use the last column to reopen an item or record refinements.

| ID | Original concern | Verified current status | Reopen / decision / notes |
| --- | --- | --- | --- |
| A1 | Need a visible way to answer/continue, including free-text comments and unanswered optional questions | “Gå vidare” exists for numeric inputs, free-text comments, and other questions needing manual advancement. Optional questions can be skipped. This applies to initial and daily questionnaires. | |
| A2 | Sexuality and violence headings use inconsistent capitalization | Both headings are uppercase. Weight and spacing remain open under #4. | |
| A3 | Contact email addresses should be links | Email addresses are clickable; telephone links are present too. | |
| A4 | External resource links should be buttons; internal links should be text | External resource buttons and internal text links are implemented. | |
| A5 | Illustrations are missing | All 37 rendered FAQ images checked with the test account loaded successfully. | |
| A6 | List text should match body text; lists should support coloured panels | Paragraphs and list text use the same size. Coloured panels containing lists are implemented. | |
| A7 | Bold text is too similar to regular text | Explicit bold text uses weight 700, compared with 400 for normal text. Plain inline links are not automatically bold. | |
| A8 | Treatment-end card says only “Svarat” instead of showing the date | The saved end date is displayed with “Ändra datum”; otherwise the card offers “Ange datum.” Start dates are displayed too. | |
| A9 | Calendar uses an awkward pink circle with a green border | Replaced by white date cells and a coral outline for today. | |
| A10 | After-treatment page is empty | Continued-use instructions, clinical follow-up, study follow-up, and contacts are present. Timeline and page-purpose decisions remain under #12 and #18. | |
| A11 | Initial-questionnaire card should show a completion checkmark | The homepage completion checkmark works. The success-screen destination remains open under #6. | |

## Optional-question text removal

The requested removal of **“Frivillig fråga – du kan gå vidare utan att svara.”** was **deployed to test on 8 October 2026** and verified absent from the deployed JavaScript bundle. Optional questions remain skippable.

- Included in test deployment: 8 October 2026
- Notes:
- [x] Deployed to test and verified

## Agreed work batches

Fill this in after reviewing the individual decisions.

| Batch | Item numbers | Desired outcome / scope | Verification needed | Deployment decision |
| --- | --- | --- | --- | --- |
| 1 | 1–11 | Implemented and deployed to test according to the decisions above; user review pending. #12 deferred. | 84 unit tests; 54 existing end-to-end tests; 135 layout checks; 120 control checks; focused checks across 32 page/viewport combinations and three submission flows; build, TypeScript, and targeted lint. | Deployed to [test](https://pre-rt.test.appadem.in) on 8 October 2026; ready for user review. |
| 2 | | | | |
| 3 | | | | |

## Local verification and review

The output links below refer to local review artifacts and are not committed.

- Automated acceptance script: [check-aina-review.js](../web/scripts/check-aina-review.js). Run in a fresh Playwright CLI session against a local preview; all API responses are synthetic.
- Questionnaire layout and control checks used the existing scripts, each in a separate browser session.
- [Focused browser results](../output/playwright/aina-review-result.txt)
- [Questionnaire layout results](../output/playwright/aina-layout-result.txt)
- [Questionnaire control results](../output/playwright/aina-controls-fresh-result.txt)
- Visual previews: [login](../output/playwright/aina-login.png), [information section](../output/playwright/aina-section-final.png), [submission panel](../output/playwright/aina-submit-final.png), [accordion](../output/playwright/aina-accordion-final-1280.png), [daily check-in](../output/playwright/aina-check-in-final-1280.png).
- Build succeeded with the existing large-bundle advisory. Deployed to test on 8 October 2026 using `scripts/deploy/test.sh`; API and web rollouts completed and health checks passed.
- Live desktop (1280px) and mobile (390px) checks passed for FAQ, about, check-in, and history navigation. The deployed bundle includes the new submission guidance and omits the optional-question sentence. No questionnaire answers were submitted during these checks. [Live check results](../output/playwright/aina-live-deploy-result.txt).
- The initial batch deployment used web image digest `sha256:3da5505484e450c1ac5ad6a879c89507b865eb4d846e67db3a3510bfa1587efd`. Production was not changed.
- Subsequent review fixes were deployed to test on 8 October 2026: quick exit in the question menu follows the current section; opening the menu centers the current question; answered/unanswered indicators reflect current form values. Desktop/mobile regression and live checks passed. The latest verified web image is `sha256:4270c203a01c4a8b4a4b516fdf643116db5eb7c971e78d1ae3656e7e12127c70`.

## Additional notes

-
