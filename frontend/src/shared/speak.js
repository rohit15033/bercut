// Web Speech API wrapper that explicitly selects an Indonesian female voice.
// Voices load asynchronously — speaking before voiceschanged fires causes
// the browser to fall back to the Windows system default (English male).
//
// Voice priority order:
//   1. Microsoft Gadis  — Edge neural female Indonesian (best on Windows kiosk)
//   2. Google Bahasa Indonesia — Chrome female Indonesian
//   3. Any id-ID voice with a feminine name keyword
//   4. Any id-ID voice (still Indonesian, even if male — beats English fallback)
//   5. Any id locale (e.g. "id" without region tag)
//   6. null — let browser pick (last resort)

let _cachedVoice = null      // resolved once per page load; null = no id-ID voice found
let _voiceResolved = false   // true once resolveVoice() has completed

// Known Microsoft Edge feminine Indonesian voice names (may vary by Windows version)
const MS_FEMALE_ID = [
  'Microsoft Gadis Online (Natural) - Indonesian (Indonesia)',
  'Microsoft Gadis - Indonesian (Indonesia)',
  'Microsoft Gadis',
]

function pickVoice(voices) {
  // 1. Microsoft Gadis (Edge neural female — best quality on Windows kiosk)
  for (const name of MS_FEMALE_ID) {
    const v = voices.find(v => v.name === name)
    if (v) return v
  }

  // 2. Any Microsoft id-ID voice whose name contains "Gadis" (case-insensitive)
  const msGadis = voices.find(v => v.lang === 'id-ID' && /gadis/i.test(v.name))
  if (msGadis) return msGadis

  // 3. Google Bahasa Indonesia (Chrome)
  const google = voices.find(v => v.name === 'Google Bahasa Indonesia')
  if (google) return google

  // 4. Any id-ID voice with a feminine name keyword
  const femaleId = voices.find(
    v => v.lang === 'id-ID' && /female|gadis|wanita|perempuan/i.test(v.name)
  )
  if (femaleId) return femaleId

  // 5. Any id-ID voice (still Indonesian — beats English fallback)
  const anyId = voices.find(v => v.lang === 'id-ID')
  if (anyId) return anyId

  // 6. Loose Indonesian locale match
  const looseId = voices.find(v => v.lang.startsWith('id'))
  if (looseId) return looseId

  return null
}

function resolveVoice() {
  return new Promise(resolve => {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      _voiceResolved = true
      resolve(pickVoice(voices))
      return
    }
    // Voices haven't loaded yet — wait for voiceschanged (fires once on Edge/Chrome)
    const handler = () => {
      _voiceResolved = true
      resolve(pickVoice(window.speechSynthesis.getVoices()))
      window.speechSynthesis.removeEventListener('voiceschanged', handler)
    }
    window.speechSynthesis.addEventListener('voiceschanged', handler)
    // Safety timeout: if event never fires, speak with no explicit voice
    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler)
      _voiceResolved = true
      resolve(null)
    }, 3000)
  })
}

/**
 * speak(text, opts?)
 * opts: { rate, onend, onerror }
 * Returns immediately; utterance queues after voice resolves.
 */
export async function speak(text, opts = {}) {
  if (!('speechSynthesis' in window)) {
    opts.onerror?.()
    return
  }
  window.speechSynthesis.cancel()

  if (!_voiceResolved) {
    _cachedVoice = await resolveVoice()
  }

  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'id-ID'
  u.rate = opts.rate ?? 0.95
  if (_cachedVoice) u.voice = _cachedVoice
  if (opts.onend)  u.onend  = opts.onend
  if (opts.onerror) u.onerror = opts.onerror
  window.speechSynthesis.speak(u)
}
