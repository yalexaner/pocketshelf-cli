import { z } from "zod";

const UnknownArray = z.array(z.unknown());

export const ReadingSessionSchema = z
  .object({
    id: z.string().optional(),
    startDate: z.number().optional(),
    startValue: z.number().optional(),
    endValue: z.number().optional(),
    notes: UnknownArray.optional().nullable(),
  })
  .passthrough();

export const PublicationSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    author: z.string().optional(),
    narrator: z.string().optional().nullable(),
    publicationType: z.string().optional(),
    bookType: z.string().optional(),
    source: z.string().optional(),
    shelf: z.string().optional(),
    added: z.number().optional(),
    isbn: z.string().optional().nullable(),
    publisher: z.string().optional().nullable(),
    bookDescription: z.string().optional().nullable(),
    dominantColorHex: z.string().optional().nullable(),
    imageData: z.string().optional().nullable(),
    categoryLabels: UnknownArray.optional().nullable(),
    bookGenre: UnknownArray.optional().nullable(),
    glossaryItems: UnknownArray.optional().nullable(),
    readingSessions: z.array(ReadingSessionSchema).optional().nullable(),
    start: z.number().optional(),
    end: z.number().optional(),
    progressMeasurementType: z.string().optional(),
  })
  .passthrough();

export const BackupSchema = z
  .object({
    publications: z.array(PublicationSchema).optional().nullable(),
    appVersion: z.string().optional().nullable(),
  })
  .passthrough();

export type Backup = z.infer<typeof BackupSchema>;
export type Publication = z.infer<typeof PublicationSchema>;
export type ReadingSession = z.infer<typeof ReadingSessionSchema>;
