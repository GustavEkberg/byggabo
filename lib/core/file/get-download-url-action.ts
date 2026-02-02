'use server';

import { Effect, Match } from 'effect';
import { AppLayer } from '@/lib/layers';
import { NextEffect } from '@/lib/next-effect';
import { getSessionWithProperty } from '@/lib/services/auth/get-session';
import { S3 } from '@/lib/services/s3/live-layer';
import { UnauthorizedError } from '@/lib/core/errors';

/**
 * Server action to get a signed URL for downloading a file from S3.
 *
 * Usage:
 * 1. Client calls this action with the file URL (stored in database)
 * 2. Server validates user is authenticated and file belongs to their property
 * 3. Client uses signed URL to access the file
 *
 * Security: Files are stored with propertyId prefix (e.g., propertyId/folder/file.jpg).
 * This action verifies the requested file belongs to the user's property.
 *
 * @example
 * ```tsx
 * const result = await getDownloadUrlAction(receipt.fileUrl)
 * if (result._tag === 'Success') {
 *   window.open(result.signedUrl, '_blank')
 * }
 * ```
 */
export const getDownloadUrlAction = async (fileUrl: string) => {
  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const { propertyId } = yield* getSessionWithProperty();
      const s3 = yield* S3;

      // Extract the object key from the URL
      const objectKey = s3.getObjectKeyFromUrl(fileUrl);

      // Verify file belongs to user's property (keys are prefixed with propertyId)
      if (!objectKey.startsWith(`${propertyId}/`)) {
        return yield* new UnauthorizedError({
          message: 'You do not have access to this file'
        });
      }

      yield* Effect.annotateCurrentSpan({
        'file.url': fileUrl,
        'file.key': objectKey,
        'property.id': propertyId
      });

      // Signed URL expires in 5 minutes - enough time to download/view
      const signedUrl = yield* s3.createSignedDownloadUrl(fileUrl, 300);

      return { signedUrl };
    }).pipe(
      Effect.withSpan('action.file.getDownloadUrl', {
        attributes: {
          'file.url': fileUrl,
          operation: 'file.getDownloadUrl'
        }
      }),
      Effect.provide(AppLayer),
      Effect.scoped,
      Effect.matchEffect({
        onFailure: error =>
          Match.value(error).pipe(
            Match.tag('UnauthenticatedError', () => NextEffect.redirect('/login')),
            Match.tag('NoPropertyError', () => NextEffect.redirect('/login')),
            Match.tag('UnauthorizedError', e =>
              Effect.succeed({
                _tag: 'Error' as const,
                message: e.message
              })
            ),
            Match.orElse(() =>
              Effect.succeed({
                _tag: 'Error' as const,
                message: 'Failed to generate download URL'
              })
            )
          ),
        onSuccess: data => Effect.succeed({ _tag: 'Success' as const, ...data })
      })
    )
  );
};
