import { useState } from 'react'
import { Home, RotateCcw } from 'lucide-react'

// ---------------------------------------------------------------------------
// One mechanic, three phases.
//
// Every phase is the same game: a set of tappable slots, each holding one
// target term, and a shuffled queue of those terms. A term is shown; you tap
// the slot that holds it. Phase 3 is the obvious case — the slots are blanks
// inside the formulas. Phase 1 is the same game where the slot is a formula
// and its target is the formula itself. Phase 2 is the same where the slot is
// a vocabulary chip and its target is itself. Once phase 1 and 2 targets are
// self-referential, all three run on useDrill below.
//
// Slots live in one table, keyed by id, each entry a [term, note] pair. The
// term is what you have to match; the note is the feedback text that explains
// what sits there.
// ---------------------------------------------------------------------------

// Terms are written "base|subscript" — 'π|θ_old' renders as π with a θ_old
// subscript. Matching is plain string equality on the whole token, so a
// symbol and its subscript are guessed together as one object.

// Phase 3, stage 1: the pieces the objective is built from — group-relative
// advantage, the importance ratio, and the per-token KL estimator.
const ADV_SLOTS = {
  'sigma-2': ['σ', 'The spread being spelled out.'],
  'op-std': ['std', "Standard deviation across the group's rewards."],
  'R-3': ['R|1', "The first rollout's reward — the start of the group."],
  'R-4': ['R|G', "The last rollout's reward — the end of the group."],

  'mu-2': ['μ', 'The group mean being spelled out.'],
  'G-1': ['G', 'The group size, averaging the sum instead of just adding it up.'],
  'op-sum-1': ['Σ', 'Adds up the rewards across the group.'],
  'G-2': ['G', 'The upper limit: one term for every rollout in the group.'],
  'R-2': ['R|i', 'The reward of the i-th rollout, one term inside the sum.'],

  'adv-1': ['Â|i', 'The group-relative advantage being defined, one value per rollout.'],
  'R-1': ['R|i', "This rollout's own reward, before the group is taken into account."],
  'mu-1': ['μ', 'The group mean, subtracted so only relative performance survives.'],
  'sigma-1': ['σ', 'The spread of the group, divided out so advantages stay comparable across prompts.'],

  'rho-1': ['ρ|i,t', 'The importance ratio for one token of one rollout, being defined here.'],
  'theta-1': ['θ', 'The parameters being optimized — the ratio moves as they do.'],
  'pi-1': ['π|θ', 'The current policy, in the numerator.'],
  'o-1': ['o|i,t', 'The token actually emitted at step t, whose probability is being measured.'],
  'cond-q-1': ['q', 'The prompt, part of what this token is conditioned on.'],
  'cond-o-1': ['o|i,<t', 'Every token generated before this one — the rest of the conditioning.'],
  'pi-2': ['π|θ_old', 'The policy as it was when this rollout was sampled, frozen in the denominator.'],
  'o-2': ['o|i,t', 'The same token, scored under the sampling policy.'],
  'cond-q-2': ['q', 'The same prompt, conditioning the sampling policy too.'],
  'cond-o-2': ['o|i,<t', 'The same prefix, so both policies score the token in identical context.'],

  'op-D-1': ['D|KL', 'The divergence estimator being defined.'],
  'pi-3': ['π|θ', 'The current policy, first argument of the divergence.'],
  'pi-4': ['π|ref', 'The frozen reference model the policy is kept close to.'],
  'pi-5': ['π|ref', 'The reference probability, on top of the ratio inside the estimator.'],
  'pi-6': ['π|θ', 'The current probability, underneath it.'],
  'op-log': ['log', 'The log of that same ratio, subtracted to keep the estimate unbiased and non-negative.'],
  'pi-7': ['π|ref', 'The reference probability again, this time inside the log.'],
  'pi-8': ['π|θ', 'The current probability again, inside the log.'],
}

// Phase 3, stage 2: the clipped surrogate itself, from the expectation down to
// the KL-penalized per-token term.
const OBJ_SLOTS = {
  'J-1': ['J', 'The objective being maximized.'],
  'theta-2': ['θ', 'The parameters the objective is a function of.'],
  'op-E': ['E', 'The expectation: everything inside is averaged over prompts and rollouts.'],
  'q-3': ['q', 'A prompt, drawn from the training distribution.'],
  'P-1': ['P', 'The distribution prompts are drawn from.'],
  'Q-1': ['Q', 'The full pool of training prompts.'],
  'o-3': ['o|i', 'One sampled rollout in the group.'],
  'G-3': ['G', 'How many rollouts are drawn for this prompt.'],
  'pi-9': ['π|θ_old', 'The policy that generated the group — sampling happens before the update.'],
  'O-1': ['O', 'The space of possible outputs.'],
  'q-4': ['q', 'The prompt those rollouts are conditioned on.'],

  'G-4': ['G', 'Averages over the group, so group size does not change the scale of the gradient.'],
  'op-sum-2': ['Σ', 'Sums over the rollouts in the group.'],
  'G-5': ['G', 'One term per rollout.'],
  'o-4': ['o|i', 'The length of this rollout, dividing so long and short answers count equally.'],
  'op-sum-3': ['Σ', 'Sums over the tokens of a single rollout.'],
  'o-5': ['o|i', 'The rollout whose length bounds the token sum.'],

  'op-min': ['min', 'Takes the smaller of the two surrogates, so an oversized ratio never helps.'],
  'rho-2': ['ρ|i,t', 'The unclipped ratio, weighting this rollout\u2019s advantage.'],
  'adv-2': ['Â|i', 'The advantage this ratio scales — positive pushes the token up, negative down.'],
  'op-clip': ['clip', 'Bounds the ratio before it multiplies the advantage.'],
  'rho-3': ['ρ|i,t', 'The same ratio, this time passed through the clip.'],
  'eps-1': ['ε', 'The lower clip bound: how far below 1 the ratio may fall.'],
  'eps-2': ['ε', 'The upper clip bound: how far above 1 the ratio may rise.'],
  'adv-3': ['Â|i', 'The same advantage, now weighting the clipped surrogate.'],

  'beta-1': ['β', 'The weight controlling how hard the KL penalty pulls.'],
  'op-D-2': ['D|KL', 'The drift penalty, subtracted from the surrogate.'],
  'pi-10': ['π|θ', 'The current policy, whose drift is being measured.'],
  'pi-11': ['π|ref', 'The frozen reference the drift is measured from.'],
}

// Phase 1: one slot per numbered formula. The target is the slot itself, so
// the note doubles as the prompt you are matching and as the label that fills
// the slot once matched.
const FORMULA_SLOTS = {
  f1: ['f1', 'How spread out the rewards are within its group of rollouts.'],
  f2: ['f2', 'The average reward across every rollout sampled for the same prompt.'],
  f3: ['f3', 'How much better or worse this rollout did than the average of its group, in standardized units.'],
  f4: ['f4', 'How much more, or less, likely the model now is to produce this token than when the rollout was sampled.'],
  f5: ['f5', 'An estimate of how far the current model has drifted from the frozen reference model, one token at a time.'],
  f6: ['f6', 'The overall training objective: reward-weighted improvement, clipped so no single update moves too far, minus a penalty for drifting from the reference model.'],
}

// Which formula number each phase-1 slot is printed beside.
const FORMULA_NUM = { f1: 1, f2: 2, f3: 3, f4: 4, f5: 5, f6: 6 }

// Phase 2, terms bank. One canonical entry per concept — position-only
// variants like R_1/R_G in the std(...) argument list collapse into R_i, same
// as the phase-3 glossary already does.
const TERM_SLOTS = {
  'gt-adv': ['Â|i', 'The group-relative advantage of rollout i.'],
  'gt-R': ['R|i', 'The reward received by a given rollout.'],
  'gt-mu': ['μ', 'The mean reward across the sampled group.'],
  'gt-sigma': ['σ', 'The standard deviation of rewards across the sampled group.'],
  'gt-G': ['G', 'The number of rollouts sampled per prompt — the group size.'],
  'gt-rho': ['ρ|i,t', "The importance ratio — the current policy's probability over the sampling policy's, for one token."],
  'gt-theta': ['θ', 'The parameters being optimized.'],
  'gt-pi': ['π|θ', 'The current policy.'],
  'gt-o-t': ['o|i,t', 'The t-th output token of rollout i.'],
  'gt-q': ['q', 'A prompt, drawn from the training set.'],
  'gt-o-lt': ['o|i,<t', 'Every token of rollout i generated before position t.'],
  'gt-pi-old': ['π|θ_old', 'The policy that generated the rollouts, frozen for this update.'],
  'gt-pi-ref': ['π|ref', 'The frozen reference model, kept fixed throughout training.'],
  'gt-J': ['J', 'The objective being maximized.'],
  'gt-P': ['P', 'The distribution that prompts are drawn from — the pool a prompt is sampled out of.'],
  'gt-Q': ['Q', 'The full training set of prompts.'],
  'gt-o': ['o|i', 'The full output — the rollout — for sample i.'],
  'gt-O': ['O', 'The space of possible outputs.'],
  'gt-eps': ['ε', 'The clip width — how far the ratio may move away from 1.'],
  'gt-beta': ['β', 'The weight on the KL penalty term.'],
}

// Phase 2, operators bank. The last three are notation only — they never
// appear as blanks in phase 3, but they are the easiest part of the notation
// to get stuck on.
const OPERATOR_SLOTS = {
  'go-sum': ['Σ', 'Summation: add up the terms that follow.'],
  'go-std': ['std', 'Standard deviation of the values given.'],
  'go-D': ['D|KL', 'An estimator of the divergence between two policies.'],
  'go-log': ['log', 'Natural logarithm.'],
  'go-E': ['E', 'Expectation — the average over the distribution that follows.'],
  'go-min': ['min', 'Take the smaller of the two arguments.'],
  'go-clip': ['clip', 'Clamp a value into the given range.'],
  'go-tilde': ['∼', 'Sampled from: q ∼ P means q is drawn at random from the distribution P.'],
  'go-bar': ['|', 'Conditioning bar, read as "given": π(o | q) means the probability of o given q. Also used for size, as in |o_i|, the number of tokens in rollout i.'],
  'go-dbar': ['‖', 'Divergence bar: separates the two distributions being compared, as in D_KL[π ‖ π_ref].'],
}

const SLOTS = {
  ...ADV_SLOTS,
  ...OBJ_SLOTS,
  ...FORMULA_SLOTS,
  ...TERM_SLOTS,
  ...OPERATOR_SLOTS,
}

const termOf = (id) => SLOTS[id][0]
const noteOf = (id) => SLOTS[id][1]

// Slots where position carries no meaning — a conditioning set, a commutative
// product. Any open slot in the group accepts whichever of the group's
// remaining terms you are currently looking for, and the feedback note is
// taken from whichever member owns the term that landed there.
const GROUPS = [
  ['cond-q-1', 'cond-o-1'], // π_θ( o | q, o_<t )
  ['cond-q-2', 'cond-o-2'], // π_θ_old( o | q, o_<t )
  ['rho-2', 'adv-2'], // ρ · Â — commutative
]

// Shown once a phase-3 round is solved.
const ADV_MAPPING = [
  ['Â_i', "How far one rollout's reward sits above its group, in units of the group's spread."],
  ['R_i', 'The verifiable reward for rollout i — hidden tests, format checks, whatever the grader returns.'],
  ['G', 'Group size: how many rollouts are sampled from the same prompt before any update.'],
  ['ρ_i,t', "The current policy's probability for a token over its probability when the rollout was sampled."],
  ['π_θ_old', 'The sampling policy, frozen for the duration of the update.'],
  ['D_KL', 'A per-token estimate of how far the policy has drifted from the frozen reference model.'],
]

const OBJ_MAPPING = [
  ['E', 'Averages everything inside over sampled prompts and over the group drawn for each one.'],
  ['1/|o_i|', 'Length normalization, so a long rollout does not outweigh a short one.'],
  ['min', 'Keeps the more pessimistic surrogate, so moving the ratio too far never pays.'],
  ['clip / ε', 'Bounds the ratio to 1 ± ε (often 0.2) before it multiplies the advantage.'],
  ['β', 'The weight on the KL penalty — set to zero in several later GRPO variants.'],
]

// Two independent dimensions for phase 3: which half of the derivation
// (stage), and whether you are drilling operators or the symbols they act on
// (mode). Only formula ids participate — 'go-' glossary ids are not blanks.
const STAGE_IDS = {
  advantage: Object.keys(ADV_SLOTS),
  objective: Object.keys(OBJ_SLOTS),
}
const FORMULA_IDS = [...STAGE_IDS.advantage, ...STAGE_IDS.objective]
const OP_IDS = new Set(FORMULA_IDS.filter((id) => id.startsWith('op-')))
const OP_TERMS = new Set([...OP_IDS].map(termOf))

function idsFor(stage, mode) {
  return STAGE_IDS[stage].filter((id) => (mode === 'operators' ? OP_IDS.has(id) : !OP_IDS.has(id)))
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
  return a
}

// ---------------------------------------------------------------------------
// The drill itself.
// ---------------------------------------------------------------------------

function initDrill(round) {
  return {
    key: round.key,
    queue: shuffle(round.ids.map(termOf)),
    filled: {}, // slot id -> the term that landed there
    wrong: null, // slot id tapped wrong on the last guess
    highlight: [], // slot ids that would have been right
    guesses: 0,
    mistakes: 0,
    feedback: null,
  }
}

// round: { key, ids }. Changing the key starts a fresh round — that is how the
// stage/mode and terms/operators toggles reset without their own handlers.
function useDrill(round) {
  const [stored, setStored] = useState(() => initDrill(round))
  const state = stored.key === round.key ? stored : initDrill(round)
  if (state !== stored) setStored(state)

  const inRound = new Set(round.ids)

  // A group only counts as a group when the whole group is in this round;
  // otherwise its slots fall back to needing their own exact term. Today's
  // stage/mode filters never split a group, but this keeps it safe to add
  // filters later.
  function groupFor(id) {
    const group = GROUPS.find((g) => g.includes(id))
    return group && group.every((gid) => inRound.has(gid)) ? group : null
  }

  function accepts(id, term) {
    const group = groupFor(id)
    if (!group) return termOf(id) === term
    const needed = group.map(termOf)
    group.forEach((gid) => {
      const assigned = state.filled[gid]
      if (assigned) {
        const idx = needed.indexOf(assigned)
        if (idx !== -1) needed.splice(idx, 1)
      }
    })
    return needed.includes(term)
  }

  // For a grouped slot the note depends on which term landed, not on which
  // slot was tapped — so scan the group for the member that owns the term.
  function noteFor(id, term) {
    const group = groupFor(id)
    if (!group) return noteOf(id)
    const owner = group.find((gid) => termOf(gid) === term)
    return owner ? noteOf(owner) : noteOf(id)
  }

  function tap(id) {
    if (state.filled[id] || state.queue.length === 0) return
    const target = state.queue[0]

    if (accepts(id, target)) {
      setStored({
        ...state,
        queue: state.queue.slice(1),
        filled: { ...state.filled, [id]: target },
        wrong: null,
        highlight: [],
        guesses: state.guesses + 1,
        feedback: { ok: true, tapped: { term: target, note: noteFor(id, target) }, answer: null },
      })
      return
    }

    // Light up every slot the term would have fit, and send the term to the
    // back of the deck — the round is not over until every slot is filled
    // correctly. The highlight stays lit until the next tap replaces it.
    const correct = round.ids.filter((oid) => !state.filled[oid] && accepts(oid, target))
    setStored({
      ...state,
      queue: [...state.queue.slice(1), target],
      wrong: id,
      highlight: correct,
      guesses: state.guesses + 1,
      mistakes: state.mistakes + 1,
      feedback: {
        ok: false,
        tapped: { term: termOf(id), note: noteOf(id) },
        answer: { term: target, note: correct.length ? noteFor(correct[0], target) : '' },
      },
    })
  }

  return {
    current: state.queue[0],
    done: state.queue.length === 0,
    found: Object.keys(state.filled).length,
    total: round.ids.length,
    guesses: state.guesses,
    mistakes: state.mistakes,
    feedback: state.feedback,
    valueOf: (id) => state.filled[id],
    stateOf: (id) =>
      state.filled[id]
        ? 'filled'
        : state.wrong === id
        ? 'wrong'
        : state.highlight.includes(id)
        ? 'highlight'
        : 'empty',
    tap,
    restart: () => setStored(initDrill(round)),
  }
}

// The one color ladder every tappable thing indexes into with stateOf().
const TONE = {
  filled: 'bg-emerald-400/10 border-emerald-400/50 text-emerald-400 cursor-default',
  wrong: 'bg-red-400/10 border-red-400/50 text-red-400 cursor-pointer',
  highlight: 'bg-sky-400/20 border-sky-400 text-sky-300 cursor-pointer',
  empty: 'bg-amber-400/10 border-amber-400/40 text-amber-400 cursor-pointer hover:bg-amber-400/20',
}

// ---------------------------------------------------------------------------
// Presentation.
// ---------------------------------------------------------------------------

function Tok({ t }) {
  const i = t.indexOf('|')
  // i < 1 covers "no pipe" (-1) and "starts with a pipe" (0) — the latter is
  // the bare '|' operator entry itself, not a base|subscript symbol.
  if (i < 1) return <>{t}</>
  return (
    <>
      {t.slice(0, i)}
      <sub className="text-[0.68em] font-normal">{t.slice(i + 1)}</sub>
    </>
  )
}

// Phase 3: a blank inside a formula.
function Blank({ tone, value, op, onTap }) {
  return (
    <span
      onClick={value ? undefined : onTap}
      className={`inline-block align-middle text-center min-w-[2.6em] px-1.5 mx-0.5 rounded border font-semibold select-none transition-colors ${
        op ? '' : 'italic'
      } ${TONE[tone]}`}
    >
      {value ? <Tok t={value} /> : '\u00A0'}
    </span>
  )
}

// Phase 1: the slot beside a numbered formula, filled in with that formula's
// description once matched.
function Slot({ tone, label, onTap }) {
  return (
    <button
      onClick={onTap}
      disabled={tone === 'filled'}
      className={`text-left text-xs leading-snug not-italic font-sans font-semibold rounded-md border px-2.5 py-2 sm:w-48 flex-shrink-0 transition-colors ${TONE[tone]}`}
    >
      {label || '\u00A0\u00A0\u00A0\u00A0'}
    </button>
  )
}

// Phase 2: a chip in the vocabulary bank. Its text is always visible — what is
// being tested is which definition it pairs with, not recovering hidden text —
// so "filled" is a color change rather than a reveal.
function TermChip({ tone, term, op, onTap }) {
  return (
    <button
      onClick={onTap}
      disabled={tone === 'filled'}
      className={`text-sm font-semibold rounded-md border px-3 py-2 transition-colors ${
        op ? '' : 'italic'
      } ${TONE[tone]}`}
    >
      <Tok t={term} />
    </button>
  )
}

function Group({ children }) {
  return (
    <span className="inline-block align-middle border border-dashed border-slate-600 rounded px-1 mx-0.5">
      {children}
    </span>
  )
}

// Stacked numerator over denominator, sized to whatever it contains.
function Frac({ num, den }) {
  return (
    <span className="inline-flex flex-col items-center align-middle mx-1 leading-snug">
      <span className="px-1.5 pb-0.5">{num}</span>
      <span className="w-full border-t border-slate-500" />
      <span className="px-1.5 pt-0.5">{den}</span>
    </span>
  )
}

// Big operator with its limits set to the right, which leaves the blanks in
// those limits large enough to actually tap.
function Limits({ op, over, under }) {
  return (
    <span className="inline-flex items-center align-middle mx-0.5">
      <span className="text-[1.5em] leading-none">{op}</span>
      <span className="inline-flex flex-col items-start text-[0.62em] leading-tight ml-0.5">
        <span>{over}</span>
        <span>{under}</span>
      </span>
    </span>
  )
}

function Eq({ num, indent = 0, children, slot }) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-start px-4 py-2 ${slot ? 'gap-2 sm:gap-4' : ''}`}
    >
      <div className="flex flex-1 min-w-0">
        <span className="w-9 flex-shrink-0 text-slate-600 text-xs pt-1.5 select-none">
          {num ? `(${num})` : ''}
        </span>
        <span className={`text-slate-100 ${indent === 1 ? 'pl-4' : indent === 2 ? 'pl-10' : ''}`}>
          {children}
        </span>
      </div>
      {slot}
    </div>
  )
}

// The two-card feedback panel, shared by phases 2 and 3.
function Feedback({ feedback, placeholder }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3">
        <p
          className={`text-sm font-semibold mb-1 ${
            !feedback ? 'text-slate-500' : feedback.ok ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          You tapped{feedback ? ' — ' : ''}
          {feedback && <Tok t={feedback.tapped.term} />}
        </p>
        <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
          {feedback ? feedback.tapped.note : placeholder}
        </p>
      </div>
      <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3">
        <p
          className={`text-sm font-semibold mb-1 ${
            !feedback || feedback.ok ? 'text-slate-500' : 'text-sky-400'
          }`}
        >
          Answer{feedback && !feedback.ok ? ' — ' : ''}
          {feedback && !feedback.ok && <Tok t={feedback.answer.term} />}
        </p>
        <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
          {!feedback ? placeholder : feedback.ok ? '' : feedback.answer.note}
        </p>
      </div>
    </div>
  )
}

// The "all matched" card every phase ends on.
function DoneCard({ title, guesses, mistakes, action }) {
  return (
    <div className="bg-slate-900 border border-emerald-400/50 rounded-xl px-5 py-4 mb-6 flex items-center justify-between">
      <div>
        <p className="text-emerald-400 text-lg font-semibold mb-1">{title}</p>
        <p className="text-slate-500 text-xs">
          {guesses} guess{guesses === 1 ? '' : 'es'} total ·{' '}
          {mistakes === 0 ? 'no misses' : `${mistakes} miss${mistakes === 1 ? '' : 'es'}`}
        </p>
      </div>
      {action}
    </div>
  )
}

function PromptCard({ label, count, children }) {
  return (
    <div className="sticky top-0 z-10 bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-slate-500 text-xs mb-1">{label}</p>
          {children}
        </div>
        <p className="text-slate-500 text-xs whitespace-nowrap pl-1">{count}</p>
      </div>
    </div>
  )
}

export default function GrpoFormulaQuiz() {
  const [phase, setPhase] = useState('select') // 'select' | 'match' | 'terms' | 'quiz'
  const [glossaryMode, setGlossaryMode] = useState('terms') // 'terms' | 'operators'
  const [stage, setStage] = useState('advantage') // 'advantage' | 'objective'
  const [mode, setMode] = useState('symbols') // 'symbols' | 'operators'

  const formulas = useDrill({ key: 'formulas', ids: Object.keys(FORMULA_SLOTS) })

  const glossaryIds = Object.keys(glossaryMode === 'operators' ? OPERATOR_SLOTS : TERM_SLOTS)
  const glossary = useDrill({ key: `glossary-${glossaryMode}`, ids: glossaryIds })

  const quizIds = idsFor(stage, mode)
  const quiz = useDrill({ key: `quiz-${stage}-${mode}`, ids: quizIds })
  const quizSet = new Set(quizIds)

  // In phases 1 and 2 the formulas are printed intact — the puzzle there is
  // matching meaning, not recovering blanked-out terms.
  const b = (id) => {
    const op = OP_IDS.has(id)
    if (phase !== 'quiz' || !quizSet.has(id)) {
      return (
        <span key={id} className={op ? 'text-slate-100' : 'text-slate-100 italic'}>
          <Tok t={termOf(id)} />
        </span>
      )
    }
    return (
      <Blank
        key={id}
        op={op}
        tone={quiz.stateOf(id)}
        value={quiz.valueOf(id)}
        onTap={() => quiz.tap(id)}
      />
    )
  }
  const sy = (t) => <span className="text-slate-400">{t}</span>

  // Phase 1 hangs a slot off each numbered equation; the other phases do not.
  const eqSlot = (id) =>
    phase === 'match' ? (
      <Slot
        tone={formulas.stateOf(id)}
        label={formulas.valueOf(id) ? noteOf(id) : ''}
        onTap={() => formulas.tap(id)}
      />
    ) : null

  const segBtn = (active) =>
    `flex-1 text-sm font-medium px-3.5 py-2 rounded-md transition-colors ${
      active ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:text-slate-300'
    }`

  const continueBtn = (target, text) => (
    <button
      onClick={() => setPhase(target)}
      className="flex items-center gap-1.5 border border-emerald-400/50 text-emerald-400 text-sm font-medium px-3.5 py-2 rounded-md"
    >
      {text}
    </button>
  )

  return (
    <div className="min-h-screen bg-slate-950 flex justify-center px-4 sm:px-5 py-6 sm:py-10">
      <div className="w-full max-w-xl">
        {phase === 'select' ? (
          <>
            <p className="text-sky-400 text-xs tracking-wide mb-2">GRPO objective drill</p>
            <h1 className="text-slate-50 text-2xl font-semibold mb-6">Choose where to start</h1>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setPhase('match')}
                className="text-left bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 hover:border-slate-500 transition-colors"
              >
                <p className="text-sky-400 text-xs tracking-wide mb-1">phase 1</p>
                <p className="text-slate-100 text-base font-semibold mb-1">
                  Match each formula to what it does
                </p>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Six numbered equations, six plain-English descriptions.
                </p>
              </button>
              <button
                onClick={() => setPhase('terms')}
                className="text-left bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 hover:border-slate-500 transition-colors"
              >
                <p className="text-sky-400 text-xs tracking-wide mb-1">phase 2</p>
                <p className="text-slate-100 text-base font-semibold mb-1">
                  Match each definition to its term or operator
                </p>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Learn the full vocabulary — quiz terms and operators separately.
                </p>
              </button>
              <button
                onClick={() => setPhase('quiz')}
                className="text-left bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 hover:border-slate-500 transition-colors"
              >
                <p className="text-sky-400 text-xs tracking-wide mb-1">phase 3</p>
                <p className="text-slate-100 text-base font-semibold mb-1">
                  Find where each symbol belongs
                </p>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Place every term inside the actual objective.
                </p>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => setPhase('select')}
                aria-label="Back to start"
                className="text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-500 rounded-md p-2 transition-colors flex-shrink-0"
              >
                <Home className="w-5 h-5" />
              </button>
              <h1 className="text-slate-50 text-2xl font-semibold">
                {phase === 'match'
                  ? 'Formulas'
                  : phase === 'terms'
                  ? 'Terms & Operators'
                  : 'Terms in Formulas'}
              </h1>
            </div>

            {phase === 'quiz' && (
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex bg-slate-900 border border-slate-700 rounded-lg p-1">
                  <button
                    onClick={() => setStage('advantage')}
                    className={segBtn(stage === 'advantage')}
                  >
                    Advantage &amp; ratio
                  </button>
                  <button
                    onClick={() => setStage('objective')}
                    className={segBtn(stage === 'objective')}
                  >
                    Clipped objective
                  </button>
                </div>

                <div className="flex bg-slate-900 border border-slate-700 rounded-lg p-1">
                  <button onClick={() => setMode('symbols')} className={segBtn(mode === 'symbols')}>
                    Symbols
                  </button>
                  <button
                    onClick={() => setMode('operators')}
                    className={segBtn(mode === 'operators')}
                  >
                    Operators
                  </button>
                </div>
              </div>
            )}

            {phase === 'terms' && (
              <div className="flex bg-slate-900 border border-slate-700 rounded-lg p-1 mb-4">
                <button
                  onClick={() => setGlossaryMode('terms')}
                  className={segBtn(glossaryMode === 'terms')}
                >
                  Terms
                </button>
                <button
                  onClick={() => setGlossaryMode('operators')}
                  className={segBtn(glossaryMode === 'operators')}
                >
                  Operators
                </button>
              </div>
            )}

            {phase === 'match' &&
              (!formulas.done ? (
                <PromptCard
                  label="Tap the formula whose description is"
                  count={`${formulas.found} / ${formulas.total}`}
                >
                  <p className="text-sky-400 text-base sm:text-lg font-semibold leading-snug">
                    {noteOf(formulas.current)}
                  </p>
                </PromptCard>
              ) : (
                <DoneCard
                  title="All six matched"
                  guesses={formulas.guesses}
                  mistakes={formulas.mistakes}
                  action={continueBtn('terms', 'Continue to phase 2 →')}
                />
              ))}

            {phase === 'terms' &&
              (!glossary.done ? (
                <PromptCard
                  label={`Tap the ${glossaryMode === 'operators' ? 'operator' : 'term'} that means`}
                  count={`${glossary.found} / ${glossary.total}`}
                >
                  {/* Every definition is rendered and all but one hidden, so
                      the card keeps a constant height as the prompt changes.
                      The queue holds terms, and glossary terms are unique
                      within a bank, so the term identifies its slot. */}
                  <div className="grid">
                    {glossaryIds.map((id) => (
                      <p
                        key={id}
                        className={`row-start-1 col-start-1 text-sky-400 text-base sm:text-lg font-semibold leading-snug ${
                          termOf(id) === glossary.current ? '' : 'invisible'
                        }`}
                      >
                        {noteOf(id)}
                      </p>
                    ))}
                  </div>
                </PromptCard>
              ) : (
                <DoneCard
                  title={`All ${glossaryMode === 'operators' ? 'operators' : 'terms'} matched`}
                  guesses={glossary.guesses}
                  mistakes={glossary.mistakes}
                  action={continueBtn('quiz', 'Continue to phase 3 →')}
                />
              ))}

            {phase === 'quiz' &&
              (!quiz.done ? (
                <PromptCard label="Tap the blank that is" count={`${quiz.found} / ${quiz.total} found`}>
                  <p
                    className={`text-sky-400 text-2xl font-semibold ${
                      OP_TERMS.has(quiz.current) ? '' : 'italic'
                    }`}
                  >
                    <Tok t={quiz.current} />
                  </p>
                </PromptCard>
              ) : (
                <DoneCard
                  title="All blanks filled"
                  guesses={quiz.guesses}
                  mistakes={quiz.mistakes}
                  action={
                    <button
                      onClick={quiz.restart}
                      className="flex items-center gap-1.5 border border-slate-700 text-slate-100 text-sm font-medium px-3.5 py-2 rounded-md"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Play again
                    </button>
                  }
                />
              ))}

            {phase !== 'terms' && (
              <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border-b border-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="ml-2 text-xs text-slate-400 font-mono">grpo_objective</span>
                </div>
                <div
                  className="py-3 font-serif text-sm sm:text-base leading-loose overflow-auto"
                  style={{ maxHeight: 500 }}
                >
                  <Eq num={FORMULA_NUM.f1} slot={eqSlot('f1')}>
                    {b('sigma-2')} {sy('=')} {b('op-std')}
                    {sy('(')} {b('R-3')}
                    {sy(', \u2026, ')} {b('R-4')} {sy(')')}
                  </Eq>

                  <Eq num={FORMULA_NUM.f2} slot={eqSlot('f2')}>
                    {b('mu-2')} {sy('=')}
                    <Frac num={sy('1')} den={b('G-1')} />
                    <Limits op={b('op-sum-1')} over={b('G-2')} under={sy('i = 1')} />
                    {b('R-2')}
                  </Eq>

                  <Eq num={FORMULA_NUM.f3} slot={eqSlot('f3')}>
                    {b('adv-1')} {sy('=')}
                    <Frac
                      num={
                        <>
                          {b('R-1')} {sy('\u2212')} {b('mu-1')}
                        </>
                      }
                      den={b('sigma-1')}
                    />
                  </Eq>

                  <Eq num={FORMULA_NUM.f4} slot={eqSlot('f4')}>
                    {b('rho-1')}
                    {sy('(')}
                    {b('theta-1')}
                    {sy(') =')}
                    <Frac
                      num={
                        <>
                          {b('pi-1')}
                          {sy('(')} {b('o-1')} {sy('|')}{' '}
                          <Group>
                            {b('cond-q-1')}
                            {sy(',')} {b('cond-o-1')}
                          </Group>{' '}
                          {sy(')')}
                        </>
                      }
                      den={
                        <>
                          {b('pi-2')}
                          {sy('(')} {b('o-2')} {sy('|')}{' '}
                          <Group>
                            {b('cond-q-2')}
                            {sy(',')} {b('cond-o-2')}
                          </Group>{' '}
                          {sy(')')}
                        </>
                      }
                    />
                  </Eq>

                  <Eq num={FORMULA_NUM.f5} slot={eqSlot('f5')}>
                    {b('op-D-1')}
                    {sy('[')} {b('pi-3')} {sy('\u2016')} {b('pi-4')} {sy('] =')}
                    <Frac num={b('pi-5')} den={b('pi-6')} />
                    {sy('\u2212')} {b('op-log')}
                    <Frac num={b('pi-7')} den={b('pi-8')} />
                    {sy('\u2212 1')}
                  </Eq>

                  <div className="mx-4 my-2 border-t border-slate-800" />

                  <Eq num={FORMULA_NUM.f6} slot={eqSlot('f6')}>
                    {b('J-1')}
                    {sy('(')}
                    {b('theta-2')}
                    {sy(') =')}
                    <span className="inline-flex items-center align-middle mx-0.5">
                      <span className="text-[1.4em] leading-none">{b('op-E')}</span>
                      <span className="inline-flex flex-col items-start gap-1 text-[0.62em] leading-normal ml-0.5">
                        <span>
                          {b('q-3')} {sy('\u223C')} {b('P-1')}
                          {sy('(')}
                          {b('Q-1')}
                          {sy(')')}
                        </span>
                        <span>
                          {sy('{')}
                          {b('o-3')}
                          {sy('}')}
                          {/* A real <sup> lifts the bordered blank out of its
                              own line box and into the row above; offset it
                              instead so it reads as an exponent without
                              moving the layout. */}
                          <span className="relative -top-[0.45em] inline-block">{b('G-3')}</span>{' '}
                          {sy('\u223C')} {b('pi-9')}
                          {sy('(')}
                          {b('O-1')} {sy('|')} {b('q-4')}
                          {sy(')')}
                        </span>
                      </span>
                    </span>
                  </Eq>

                  <Eq indent={1}>
                    <Frac num={sy('1')} den={b('G-4')} />
                    <Limits op={b('op-sum-2')} over={b('G-5')} under={sy('i = 1')} />
                    <Frac
                      num={sy('1')}
                      den={
                        <>
                          {sy('|')}
                          {b('o-4')}
                          {sy('|')}
                        </>
                      }
                    />
                    <Limits
                      op={b('op-sum-3')}
                      over={
                        <>
                          {sy('|')}
                          {b('o-5')}
                          {sy('|')}
                        </>
                      }
                      under={sy('t = 1')}
                    />
                    {sy('[')}
                  </Eq>

                  <Eq indent={2}>
                    {b('op-min')}
                    {sy('(')}{' '}
                    <Group>
                      {b('rho-2')} {sy('\u00B7')} {b('adv-2')}
                    </Group>
                    {sy(',')} {b('op-clip')}
                    {sy('(')}
                    {b('rho-3')}
                    {sy(', 1 \u2212')} {b('eps-1')}
                    {sy(', 1 +')} {b('eps-2')}
                    {sy(')')} {sy('\u00B7')} {b('adv-3')} {sy(')')}
                  </Eq>

                  <Eq indent={2}>
                    {sy('\u2212')} {b('beta-1')} {sy('\u00B7')} {b('op-D-2')}
                    {sy('[')} {b('pi-10')} {sy('\u2016')} {b('pi-11')} {sy(']')} {sy(']')}
                  </Eq>

                  <Eq indent={1}>
                    <span className="text-slate-500 text-xs not-italic">
                      sampling happens under θ_old; the update moves θ only
                    </span>
                  </Eq>
                </div>
              </div>
            )}

            {phase === 'terms' && (
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex flex-wrap gap-2">
                {glossaryIds.map((id) => (
                  <TermChip
                    key={id}
                    term={termOf(id)}
                    op={glossaryMode === 'operators'}
                    tone={glossary.stateOf(id)}
                    onTap={() => glossary.tap(id)}
                  />
                ))}
              </div>
            )}

            {phase === 'terms' && (
              <Feedback feedback={glossary.feedback} placeholder="Tap an entry to see feedback here." />
            )}

            {phase === 'quiz' && (
              <>
                <Feedback feedback={quiz.feedback} placeholder="Tap a blank to see feedback here." />

                {quiz.done && (
                  <div className="mt-6 border-t border-slate-800 pt-5">
                    <p className="text-slate-500 text-xs mb-3">
                      {stage === 'advantage'
                        ? 'What each piece of the setup is'
                        : 'What each piece of the objective does'}
                    </p>
                    <dl className="space-y-2.5">
                      {(stage === 'advantage' ? ADV_MAPPING : OBJ_MAPPING).map(([term, gloss]) => (
                        <div key={term} className="flex flex-col sm:flex-row sm:gap-3">
                          <dt className="text-sky-400 text-sm font-semibold sm:w-24 sm:flex-shrink-0">
                            {term}
                          </dt>
                          <dd className="text-slate-400 text-sm leading-relaxed">{gloss}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
