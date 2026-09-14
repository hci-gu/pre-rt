# Study configuration

The `studySettings` collection has one record, with `key = default`. Authenticated
participants can read it; only PocketBase superusers can create or edit it.

| Relation | Used by |
| --- | --- |
| `baselineQuestionnaire` | Dashboard baseline task and completion |
| `dailyQuestionnaire` | Check-in links and daily answer status |
| `treatmentEndQuestionnaire` | Check-in link, reminder URL, and treatment-end answer processing |
| `treatmentEndQuestion` | Date answer copied to the participant's `treatmentEnd` |
| `aboutCollection` | `/about` study information |

The backend reads the same settings as the web app. The treatment-end question
must belong to the selected questionnaire and have type `date`. Invalid settings
are reported rather than falling back to hardcoded IDs. Refresh the web page
after editing settings to load the new relations.

Migrations `1788952000` and `1788952100` create the settings schema, wire the
existing study forms, and create an About resource collection. On installations
without the original study content, create the resources/forms and the `default`
settings record manually. Record IDs in these migrations are initial data only.

Edit the About collection's `name`/`pageTitle`, `description`, and ordered
`resources` relations in PocketBase. It is hidden from the FAQ category index.
The timing, questionnaire explanation, and contact answers reuse existing
resource records; editing one updates every place using that resource.
Timing retains the existing PRE/POST audience markup. Contact information is
taken from the stored resource, not the former hardcoded page copy; its editorial
accuracy still needs confirmation by the study team.

`/after-treatment` is intentionally an empty, authenticated page with a heading
and the shared study shell. It does not introduce a follow-up questionnaire or
change participant eligibility. Questionnaire quick-exit rules are unchanged.
