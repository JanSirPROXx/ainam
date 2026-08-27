import {
  ACCEPTED_IMAGE_FORMATS,
  MAX_INPUT_PIXELS,
  MAX_STORED_DIMENSION,
  MAX_UPLOAD_BYTES,
  describeBytes,
} from '@ainam/schema'
import sharp, { type Sharp } from 'sharp'
import { HttpError } from '../../http/errors'

export interface DecodedImage {
  /** One EXIF-stripped, dimension-capped WebP. */
  bytes: Buffer
  width: number
  height: number
}

/**
 * Turns whatever was uploaded into the one image we store.
 *
 * The decoded header is the source of truth for the format — never the declared
 * Content-Type and never the filename, both of which the caller writes. An
 * attacker who can name a file `logo.png` cannot make us treat an SVG as a PNG,
 * and an SVG stored on the origin that serves a customer's site is stored XSS.
 */
export async function decodeImage(input: Buffer, filename: string): Promise<DecodedImage> {
  // Checked again here, after buffering: the streaming cap can be bypassed by a
  // lying Content-Length, and this is the size we actually hold.
  if (input.byteLength > MAX_UPLOAD_BYTES) throw tooLarge(input.byteLength)

  const image = sharp(input, {
    // Without this a 4 kB PNG expands to gigabytes inside libvips and takes the
    // content read path down with it — no byte cap catches that, because the
    // file really is 4 kB.
    limitInputPixels: MAX_INPUT_PIXELS,
    failOn: 'error',
  })

  const source = await readMetadata(image, filename)
  assertAcceptedFormat(source.format, filename)

  const output = await image
    // Applies the EXIF orientation and then drops the tag with it, so a photo
    // taken sideways is stored upright rather than carrying metadata that also
    // holds the place it was taken.
    .rotate()
    .resize({
      width: MAX_STORED_DIMENSION,
      height: MAX_STORED_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true })

  return { bytes: output.data, width: output.info.width, height: output.info.height }
}

async function readMetadata(image: Sharp, filename: string) {
  try {
    return await image.metadata()
  } catch (error) {
    throw new HttpError(
      400,
      'bad_request',
      `"${filename}" could not be read as an image. ${describeSharpFailure(error)}`,
    )
  }
}

function assertAcceptedFormat(format: string | undefined, filename: string): void {
  if (format && (ACCEPTED_IMAGE_FORMATS as readonly string[]).includes(format)) return

  const accepted = ACCEPTED_IMAGE_FORMATS.join(', ')
  const named = format === 'svg' ? 'SVG' : (format ?? 'that file type')
  throw new HttpError(
    400,
    'bad_request',
    format === 'svg'
      ? `SVG is not accepted, because it can carry script that would then run on your own site. ` +
          `Upload one of ${accepted}.`
      : `"${filename}" is ${named}, which is not accepted. Upload one of ${accepted}.`,
  )
}

function tooLarge(byteSize: number): HttpError {
  return new HttpError(
    413,
    'bad_request',
    `That file is ${describeBytes(byteSize)}. The limit is ${describeBytes(MAX_UPLOAD_BYTES)}.`,
  )
}

/** libvips messages are terse but specific; passing one on beats inventing one. */
function describeSharpFailure(error: unknown): string {
  const message = error instanceof Error ? error.message.split('\n')[0] : String(error)
  return message ?? 'The file is not an image this server can decode.'
}
