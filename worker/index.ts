import { SCRIBBLE_DESCRIBE, SUBJECTS, SUBJECT_KEYS, isSubjectKey, isTaskKey, type SubjectKey } from '../shared/subjects'
import { JUDGE_GRID, JUDGE_LIMITS, type JudgeError, type JudgeRequest, type JudgeResponse } from '../shared/judge'
import { ENCODING_FOR, encode, isEncoding } from './encodings'
import { runJev } from './jev'

const words = (k: string) => k.replace(/_/g, ' ')
/** Choice criteria: every subject in the shape vocabulary, plus "scribble". */
const CRITERIA = {
  ...Object.fromEntries(SUBJECT_KEYS.map(k => [k, `${words(k)}: ${SUBJECTS[k].describe}`])) as Record<SubjectKey, string>,
  scribble: SCRIBBLE_DESCRIBE
}


export default {
  async fetch(req, env) {
    const url = new URL(req.url)
    if (url.pathname === '/api/judge') {
      if (req.method !== 'POST') return new Response(null, { status: 405, headers: { allow: 'POST' } })
      return judge(req, env)
    }
    return new Response(null, { status: 404 })
  }
} satisfies ExportedHandler<Env>

async function judge(req: Request, env: Env): Promise<Response> {
  // Lab mode (LAB=1 in .dev.vars, local only): no rate limit, encoding override and debug output
  // for the eval harness.
  const lab = env.LAB === '1'
  if (!lab) {
    const ip = req.headers.get('cf-connecting-ip') ?? 'local'
    const { success } = await env.JUDGE_LIMITER.limit({ key: ip })
    if (!success) return fail(429, 'rate_limited', 'Too many judge requests')
  }

  const body = parseRequest(await req.json().catch(() => null))
  if (typeof body === 'string') return fail(400, 'bad_request', body)

  const asked = req.headers.get('x-judge-strategy')
  const enc = lab && isEncoding(asked) ? asked : ENCODING_FOR[body.mode ?? 'live']
  try {
    const state = await encode(enc, body.strokes, body.times, env.AI)
    const res = await runJev(env.AI, {
      state,
      questions: {
        guess: {
          type: 'choice',
          instructions: 'Which of these does the drawing match best? Judge generously, like a friend playing Pictionary.',
          criteria: CRITERIA
        },
        accept: {
          type: 'noul',
          instructions: `The player was asked to draw ${words(body.target)}: ${SUBJECTS[body.target].describe}. Would a fair, friendly judge accept this quick doodle as that?`,
          criteria: {
            true: 'The doodle recognisably shows the requested subject, even if it is rough',
            false: 'It is a scribble, unfinished, or clearly shows something else'
          }
        }
      }
    })
    const { guess, accept } = res.answers
    const key = isSubjectKey(guess.choice) ? guess.choice : null
    const out: JudgeResponse = {
      guess: key,
      confidence: clamp01(key ? guess.probabilities[key] ?? guess.confidence : 0),
      targetConfidence: clamp01(guess.probabilities[body.target] ?? 0),
      accept: clamp01(accept.noul),
      model: res.model
    }
    console.log(`[judge] ${enc} target=${body.target} guess=${out.guess} conf=${out.confidence.toFixed(2)} target=${out.targetConfidence.toFixed(2)} accept=${out.accept.toFixed(2)}`)
    return Response.json(lab ? { ...out, debug: state } : out, { headers: { 'cache-control': 'no-store' } })
  } catch (err) {
    console.error('Jev call failed', err)
    return fail(502, 'model_error', 'The judge model is unavailable')
  }
}

/** Returns the validated request, or an error message. */
function parseRequest(raw: unknown): JudgeRequest | string {
  if (!raw || typeof raw !== 'object') return 'Body must be a JSON object'
  const { target, strokes } = raw as Record<string, unknown>
  if (!isTaskKey(target)) return 'Unknown target'
  if (!Array.isArray(strokes) || !strokes.length || strokes.length > JUDGE_LIMITS.strokes) return 'Invalid strokes'
  let total = 0
  for (const s of strokes) {
    if (!Array.isArray(s) || !s.length || s.length % 2 || s.length > JUDGE_LIMITS.pointsPerStroke * 2) return 'Invalid stroke'
    if (!s.every(v => Number.isInteger(v) && v >= 0 && v <= JUDGE_GRID)) return 'Stroke coordinates out of range'
    total += s.length / 2
  }
  if (total > JUDGE_LIMITS.totalPoints) return 'Too many points'
  const { times } = raw as Record<string, unknown>
  if (times !== undefined) {
    const ok = Array.isArray(times) && times.length === strokes.length && times.every((t, i) =>
      Array.isArray(t) && t.length === (strokes[i] as number[]).length / 2 && t.every(v => Number.isInteger(v) && v >= 0 && v <= 120000))
    if (!ok) return 'Invalid times'
  }
  const { mode } = raw as Record<string, unknown>
  if (mode !== undefined && mode !== 'live' && mode !== 'final') return 'Invalid mode'
  return { target, strokes: strokes as number[][], times: times as number[][] | undefined, mode }
}

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0)

function fail(status: number, error: JudgeError['error'], message: string) {
  return Response.json({ error, message } satisfies JudgeError, { status })
}
