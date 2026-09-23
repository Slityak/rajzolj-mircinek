import { SUBJECTS, SUBJECT_KEYS, isSubjectKey, isTaskKey, type SubjectKey } from '../shared/subjects'
import { JUDGE_GRID, JUDGE_LIMITS, type JudgeError, type JudgeRequest, type JudgeResponse } from '../shared/judge'
import { describeDoodle } from '../shared/describe'
import { runJev } from './jev'

const SCRIBBLE = 'scribble'

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
  const ip = req.headers.get('cf-connecting-ip') ?? 'local'
  const { success } = await env.JUDGE_LIMITER.limit({ key: ip })
  if (!success) return fail(429, 'rate_limited', 'Too many judge requests')

  const body = parseRequest(await req.json().catch(() => null))
  if (typeof body === 'string') return fail(400, 'bad_request', body)

  const target = SUBJECTS[body.target].describe
  const doodle = describeDoodle(body.strokes)
  try {
    const res = await runJev(env.AI, {
      state: {
        context: 'A player is drawing a quick doodle with a mouse or finger in under 20 seconds. ' +
          'Below is a geometric description of the pen strokes on the page.',
        doodle
      },
      questions: {
        guess: {
          type: 'choice',
          instructions: 'What does this doodle most likely depict? Judge the shape generously, like a friend playing Pictionary.',
          criteria: {
            ...Object.fromEntries(SUBJECT_KEYS.map(k => [k, SUBJECTS[k].describe])) as Record<SubjectKey, string>,
            [SCRIBBLE]: 'Nothing recognisable yet: random lines, a few unrelated strokes or too little ink'
          }
        },
        accept: {
          type: 'noul',
          instructions: `The player was asked to draw ${target}. Would a fair, friendly judge accept this quick doodle as that?`,
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
    console.log(`[judge] target=${body.target} guess=${out.guess} conf=${out.confidence.toFixed(2)} target=${out.targetConfidence.toFixed(2)} accept=${out.accept.toFixed(2)} | ${doodle.replace(/\n/g, ' / ')}`)
    return Response.json(out, { headers: { 'cache-control': 'no-store' } })
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
  return { target, strokes: strokes as number[][] }
}

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0)

function fail(status: number, error: JudgeError['error'], message: string) {
  return Response.json({ error, message } satisfies JudgeError, { status })
}
