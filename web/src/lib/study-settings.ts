import { z } from 'zod'

// Record IDs belong in PocketBase relations, not in presentation or workflow code.
export const studySettingsSchema = z.object({
  baselineQuestionnaire: z.string().min(1),
  dailyQuestionnaire: z.string().min(1),
  treatmentEndQuestionnaire: z.string().min(1),
  treatmentEndQuestion: z.string().min(1),
  aboutCollection: z.string().min(1),
})

export type StudySettings = z.infer<typeof studySettingsSchema>
