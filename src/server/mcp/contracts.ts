import { z } from 'zod';
import { ApiModelSchema } from '../../engine/contracts';

export const NotesSchema = z
  .array(
    z.strictObject({
      title: z.string().trim().min(1).max(120),
      detail: z.string().trim().min(1).max(2000),
    }),
  )
  .max(20);
export const AuthSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('none') }),
  z.strictObject({ type: z.literal('bearer') }),
  z.strictObject({
    type: z.literal('apiKey'),
    header: z
      .string()
      .regex(/^[A-Za-z][A-Za-z0-9-]{0,63}$/)
      .refine(
        (name) =>
          !/^(host|authorization|cookie|content-.*|accept.*|connection|transfer-encoding|proxy-.*|sec-.*|te|trailer|upgrade|user-agent|keep-alive|expect)$/i.test(
            name,
          ),
        'Use a dedicated API-key header',
      ),
  }),
]);
export const ConversionSchema = z
  .strictObject({
    source: z
      .string()
      .min(1)
      .max(2 * 1024 * 1024)
      .optional(),
    projectId: z.uuid().optional(),
    name: z.string().trim().min(1).max(100),
    baseUrl: z.string().max(2048),
    operationIds: z
      .array(z.string().min(1).max(512))
      .min(1)
      .max(200)
      .refine((ids) => new Set(ids).size === ids.length, 'Duplicate selection'),
    auth: AuthSchema,
    originalNotes: z.string().max(16000),
    importantNotes: NotesSchema,
    notesApproved: z.literal(true),
  })
  .refine(
    (input) => Boolean(input.source) !== Boolean(input.projectId),
    'Provide a source or saved project',
  );
export const SavedProjectSchema = z.object({
  project: z.object({ specification: ApiModelSchema.nullable() }),
});
export type Conversion = z.infer<typeof ConversionSchema>;
export type ImportantNotes = z.infer<typeof NotesSchema>;

export function originalImportantNotes(original: string): ImportantNotes {
  const chunks = original.match(/[\s\S]{1,2000}/g) ?? [];
  return chunks.map((detail, index) => ({
    title:
      chunks.length > 1 ? `Developer notes ${index + 1}` : 'Developer notes',
    detail,
  }));
}
