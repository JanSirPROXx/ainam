import { MAX_STORED_DIMENSION, MAX_UPLOAD_BYTES } from '@ainam/schema'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { HttpError } from '../src/http/errors'
import { decodeImage } from '../src/services/assets/decode-image'

const solid = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: '#3a3a3a' } })

async function failureFor(input: Buffer, filename: string): Promise<HttpError> {
  try {
    await decodeImage(input, filename)
  } catch (error) {
    return error as HttpError
  }
  throw new Error('expected this input to be refused')
}

describe('decodeImage', () => {
  it('accepts every format on the allowlist and stores one WebP', async () => {
    for (const format of ['png', 'jpeg', 'webp', 'gif'] as const) {
      const input = await solid(40, 20)[format]().toBuffer()
      const decoded = await decodeImage(input, `logo.${format}`)
      const stored = await sharp(decoded.bytes).metadata()
      expect(`${format} -> ${stored.format}`).toBe(`${format} -> webp`)
      expect(decoded.width).toBe(40)
      expect(decoded.height).toBe(20)
    }
  })

  it('refuses an SVG, and says why rather than just naming the formats', async () => {
    // An SVG can carry script, and it would be served from the origin that
    // serves the customer's own site.
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>',
    )
    const failure = await failureFor(svg, 'logo.svg')
    expect(failure.status).toBe(400)
    expect(failure.message).toContain('script')
    expect(failure.message).toContain('jpeg, png, webp, avif, gif')
  })

  it('decides the format from the header, not the filename', async () => {
    // The one that matters: an attacker names the file whatever they like.
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>')
    expect((await failureFor(svg, 'definitely-a.png')).message).toContain('SVG')
  })

  it('refuses something that is not an image at all', async () => {
    const failure = await failureFor(Buffer.from('not an image, just bytes'), 'notes.txt')
    expect(failure.status).toBe(400)
    expect(failure.message).toContain('notes.txt')
  })

  it('caps the long edge without enlarging what is already smaller', async () => {
    const wide = await solid(MAX_STORED_DIMENSION * 2, 100).png().toBuffer()
    const decoded = await decodeImage(wide, 'wide.png')
    expect(decoded.width).toBe(MAX_STORED_DIMENSION)

    const small = await solid(24, 24).png().toBuffer()
    expect((await decodeImage(small, 'small.png')).width).toBe(24)
  })

  it('strips metadata, so a photo does not carry where it was taken', async () => {
    const withExif = await solid(30, 30)
      .withExif({ IFD0: { Copyright: 'someone', Artist: 'someone' } })
      .jpeg()
      .toBuffer()
    expect((await sharp(withExif).metadata()).exif).toBeDefined()

    const decoded = await decodeImage(withExif, 'photo.jpg')
    expect((await sharp(decoded.bytes).metadata()).exif).toBeUndefined()
  })

  it('refuses a buffer over the cap, which the streaming limit can miss', async () => {
    // The streaming cap trusts a Content-Length the caller writes; this is the
    // size actually held in memory.
    const failure = await failureFor(Buffer.alloc(MAX_UPLOAD_BYTES + 1), 'huge.png')
    expect(failure.status).toBe(413)
    expect(failure.message).toContain('20 MB')
  })
})
