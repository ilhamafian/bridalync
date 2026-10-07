import { z } from "zod";

export const MAX_CLIENT_QUESTIONS = 10;
export const MAX_CLIENT_QUESTION_OPTIONS = 10;
export const CLIENT_QUESTION_TITLE_MAX_LENGTH = 120;
export const CLIENT_QUESTION_OPTION_MAX_LENGTH = 80;
export const CLIENT_ANSWER_MAX_LENGTH = 500;
/** Photos or PDFs. */
export const MAX_MOODBOARD_IMAGES = 5;

/** Whether the booking wizard asks for the client's Instagram username. */
export const instagramRequirementSchema = z.enum(["off", "optional", "required"]);

/** Extra info the stylist requests at the end of booking; no options = free-text answer. */
export const clientQuestionSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().trim().min(1).max(CLIENT_QUESTION_TITLE_MAX_LENGTH),
  options: z
    .array(z.string().trim().min(1).max(CLIENT_QUESTION_OPTION_MAX_LENGTH))
    .max(MAX_CLIENT_QUESTION_OPTIONS),
  required: z.boolean(),
});

export const clientInfoSettingSchema = z.object({
  /** Missing = off. */
  instagram: instagramRequirementSchema.optional(),
  /** Missing = disabled. */
  moodboard: z.boolean().optional(),
  questions: z.array(clientQuestionSchema).max(MAX_CLIENT_QUESTIONS).optional(),
});

/** What the client filled in; answers keep the question title as asked. */
export const bookingClientDetailsSchema = z.object({
  instagram: z.string().optional(),
  moodboardUrls: z.array(z.string()).max(MAX_MOODBOARD_IMAGES).optional(),
  answers: z
    .array(
      z.object({
        questionId: z.string(),
        title: z.string(),
        answer: z.string(),
      })
    )
    .optional(),
});

export const clientDetailsInputSchema = z.object({
  instagram: z.string().max(100).optional(),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1).max(64),
        answer: z.string().max(CLIENT_ANSWER_MAX_LENGTH),
      })
    )
    .max(MAX_CLIENT_QUESTIONS)
    .optional(),
});

export type InstagramRequirement = z.infer<typeof instagramRequirementSchema>;
export type ClientQuestion = z.infer<typeof clientQuestionSchema>;
export type ClientInfoSetting = z.infer<typeof clientInfoSettingSchema>;
export type BookingClientDetails = z.infer<typeof bookingClientDetailsSchema>;
export type ClientDetailsInput = z.infer<typeof clientDetailsInputSchema>;
