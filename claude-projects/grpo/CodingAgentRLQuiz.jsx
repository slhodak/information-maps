import { useState } from 'react'
import { RotateCcw } from 'lucide-react'

// Stage 1: the original rollout loop. RL-concept vocabulary (Environment /
// Agent / State / Action / Reward / Trajectory / Advantage) plus every
// function, argument, and variable name that appears as plain text.
const ROLLOUT_OCC = {
  'env-1': 'Environment',
  'agent-1': 'Agent',
  'state-1': 'State',
  'env-2': 'Environment',
  'traj-1': 'Trajectory',
  'action-1': 'Action',
  'agent-2': 'Agent',
  'state-2': 'State',
  'env-3': 'Environment',
  'action-2': 'Action',
  'state-3': 'State',
  'traj-2': 'Trajectory',
  'state-5': 'State',
  'action-3': 'Action',
  'reward-1': 'Reward',
  'traj-3': 'Trajectory',
  'reward-2': 'Reward',
  'traj-5': 'Trajectory',
  'reward-4': 'Reward',

  'fn-create-sandbox': 'create_sandbox',
  'kwarg-image': 'image',
  'lit-pyver': 'python:3.11',
  'fn-load-policy': 'load_policy',
  'arg-checkpoint': 'checkpoint',
  'fn-rollout-1': 'rollout',
  'param-issue-1': 'issue',
  'fn-reset': 'reset',
  'param-issue-2': 'issue',
  'arg-file-tree': 'file_tree',
  'arg-max-steps': 'max_steps',
  'fn-generate': 'generate',
  'var-stdout-1': 'stdout',
  'var-submitted-1': 'submitted',
  'fn-exec': 'exec',
  'var-stdout-2': 'stdout',
  'fn-append': 'append',
  'var-submitted-2': 'submitted',
  'fn-grade': 'grade',
  'arg-hidden-tests': 'hidden_tests',
  'arg-syntax-errors': 'syntax_errors',
  'arg-runtime': 'runtime',
  'var-rollouts-1': 'rollouts',
  'fn-rollout-2': 'rollout',
  'param-issue-3': 'issue',
  'var-baseline-1': 'baseline',
  'var-rollouts-2': 'rollouts',
  'var-rollouts-3': 'rollouts',

  'fn-update-policy-2': 'update_policy',
  'traj-12': 'Trajectory',
  'reward-6': 'Reward',
  'var-baseline-4': 'baseline',
}

// Stage 2: clipped surrogate loss + KL penalty, wrapped in its own function
// (update_policy) and called once per rollout from the outer loop, the same
// way rollout() itself is defined once and called from the list comprehension.
const LOSS_OCC = {
  'fn-update-policy-1': 'update_policy',
  'traj-11': 'Trajectory',
  'reward-5': 'Reward',
  'var-baseline-3': 'baseline',

  'adv-1': 'Advantage',
  'reward-3': 'Reward',
  'var-baseline-2': 'baseline',

  'agent-4': 'Agent',
  'agent-5': 'Agent',
  'agent-6': 'Agent',
  'traj-6': 'Trajectory',
  'traj-7': 'Trajectory',
  'traj-8': 'Trajectory',
  'traj-9': 'Trajectory',
  'traj-10': 'Trajectory',
  'adv-3': 'Advantage',
  'adv-4': 'Advantage',

  'fn-evaluate-log-probs': 'evaluate_log_probs',
  'fn-exp': 'exp',
  'fn-clamp': 'clamp',
  'fn-min': 'min',
  'fn-sum-1': 'sum',
  'fn-sum-2': 'sum',
  'fn-compute-kl': 'compute_kl_divergence',
  'fn-backward': 'backward',
  'fn-step': 'step',

  'var-log-probs-1': 'log_probs',
  'var-log-probs-2': 'log_probs',
  'var-old-log-probs': 'old_log_probs',
  'var-ratio-1': 'ratio',
  'var-ratio-2': 'ratio',
  'var-ratio-3': 'ratio',
  'var-surr1': 'surr1',
  'var-surr2': 'surr2',
  'param-eps-1': 'eps',
  'param-eps-2': 'eps',
  'var-policy-loss-1': 'policy_loss',
  'var-policy-loss-2': 'policy_loss',
  'var-resp-mask-1': 'response_mask',
  'var-resp-mask-2': 'response_mask',
  'var-masked-loss-1': 'masked_loss',
  'var-masked-loss-2': 'masked_loss',
  'var-kl-pen-1': 'kl_penalty',
  'var-kl-pen-2': 'kl_penalty',
  'var-ref-policy': 'ref_policy',
  'param-beta': 'beta',
  'var-total-loss-1': 'total_loss',
  'var-total-loss-2': 'total_loss',
  'var-surr1-2': 'surr1',
  'var-surr2-2': 'surr2',
}

const OCC = { ...ROLLOUT_OCC, ...LOSS_OCC }

// Shown once a round is solved: what each concept means, split by stage.
const ROLLOUT_MAPPING = [
  ['Environment', 'Isolated sandbox — workspace files, shell, interpreter, test runner.'],
  ['Agent', 'The policy being trained — it reads the state and emits the next action.'],
  ['State', 'Issue text, current files, and the last stdout, stack trace, or test report.'],
  ['Action', 'Tokens the model emits: a file edit or a shell command.'],
  ['Reward', 'Verifiable score — hidden tests passed, minus syntax and runtime penalties.'],
  ['Trajectory', 'The whole rollout: every state the agent saw and every action it took.'],
]

const LOSS_MAPPING = [
  ['Advantage', 'How far one rollout sits above the mean reward of its group.'],
  ['ratio', "The current policy's probability for an action over its probability when the rollout was sampled."],
  ['clamp / eps', 'The clipping bound (often ±0.2) that keeps one update from moving the ratio too far.'],
  ['response_mask', 'A 0/1 mask so gradients only flow through tokens the model generated, not the prompt.'],
  ['kl_penalty', 'A divergence term discouraging the policy from drifting far from the frozen reference model.'],
]

// Short, context-specific flavor text for ungrouped blanks — grouped ones
// (see GROUP_NOTES below) are keyed by term instead, since the term that
// lands in a group's slot can vary depending on tap order.
const LOCATION_NOTES = {
  'env-1': 'The sandbox spun up fresh for this rollout.',
  'agent-1': 'The policy, loaded from its saved weights.',
  'state-1': "The initial state, straight from the sandbox's reset.",
  'env-2': 'The sandbox being reset to start the episode.',
  'traj-1': "The empty list that will collect this rollout's steps.",
  'action-1': 'The token sequence the policy outputs this step.',
  'agent-2': 'The policy, generating an action from the current state.',
  'state-2': 'The state fed into the policy to produce an action.',
  'env-3': "The sandbox executing this step's action.",
  'action-2': 'The action being run inside the sandbox.',
  'state-3': "The state, updated in place with this step's output.",
  'traj-2': "The running list this step's (state, action) gets appended to.",
  'reward-1': 'The score computed from hidden tests and penalties.',
  'adv-1': 'How much better or worse this rollout did than the group average.',
  'reward-3': "This rollout's own score, used to compute its advantage.",

  'fn-create-sandbox': 'The function that spins up the sandbox container.',
  'kwarg-image': 'The keyword argument naming which container image to boot.',
  'lit-pyver': 'The actual image tag being requested.',
  'fn-load-policy': 'The function that loads the model weights.',
  'arg-checkpoint': 'The saved weights being loaded.',
  'fn-rollout-1': 'The function that runs one full episode for a given issue.',
  'param-issue-1': 'The coding task this rollout is trying to solve.',
  'fn-reset': 'The sandbox method that sets up the workspace for a new issue.',
  'arg-max-steps': 'The cap on how many edit/execute steps one rollout can take.',
  'fn-generate': 'The policy method that produces an action from a state.',
  'fn-exec': "The sandbox method that runs the agent's action.",
  'var-stdout-2': 'The console output from this step, appended onto the state the agent reads next.',
  'fn-append': "The list method recording this step's tuple.",
  'var-submitted-2': 'The flag that ends the loop once the agent submits.',
  'fn-grade': 'The function that scores the finished attempt.',
  'var-rollouts-1': 'The list collecting every parallel attempt at this issue.',
  'fn-rollout-2': 'The function that runs one full episode, called once per sample in the group.',
  'param-issue-3': 'The coding task every rollout in this group is attempting.',
  'var-baseline-1': "The group's mean reward, used as the comparison point.",
  'var-rollouts-2': 'The list of finished rollouts, whose rewards are averaged into the baseline.',
  'var-rollouts-3': 'The list of finished rollouts, unpacked one at a time.',
  'var-baseline-2': "The group's mean reward, subtracted to center this rollout's score.",
  'fn-update-policy-2': 'The function that turns one rollout into a gradient step, called once per rollout.',

  'agent-4': "The policy, asked for its current log-probability on this trajectory's actions.",
  'fn-update-policy-1': 'The function that turns one rollout into a gradient step.',
  'fn-evaluate-log-probs': 'The method that scores how likely the policy is to produce this trajectory now.',
  'traj-6': 'The trajectory whose actions are being re-scored under the current policy.',
  'var-log-probs-1': "The policy's current log-probability for the actions actually taken.",
  'var-ratio-1':
    "The current policy's probability for these actions over the sampling policy's, after exp.",
  'fn-exp': 'Converts the log-probability difference back into a plain probability ratio.',
  'var-log-probs-2': "The policy's log-probability for these actions under its current weights.",
  'traj-7': 'The trajectory holding the log-probabilities recorded when it was first sampled.',
  'var-old-log-probs': "The policy's log-probability for these actions back when the rollout was collected.",
  'var-surr1': 'The unclipped surrogate objective: ratio times advantage.',
  'var-surr2': 'The clipped surrogate objective, capping how far the ratio can move.',
  'fn-clamp': 'Clips the ratio into a safe range before it multiplies the advantage.',
  'var-ratio-3': 'The current-vs-sampling probability ratio, clipped here before it weights the advantage.',
  'param-eps-1': 'The clip width, bounding how far below 1 the ratio may fall.',
  'param-eps-2': 'The clip width, bounding how far above 1 the ratio may rise.',
  'adv-4': "This rollout's advantage, weighting the clipped objective.",
  'var-policy-loss-1': 'The final per-token loss: the more conservative surrogate, negated.',
  'fn-min': 'Takes whichever surrogate is smaller, so a large ratio move never helps.',
  'var-masked-loss-1': 'The policy loss, averaged only over tokens the model actually generated.',
  'var-policy-loss-2': 'The per-token policy loss, about to be masked and averaged.',
  'traj-8': "The trajectory whose mask marks which tokens were the model's own output.",
  'var-resp-mask-1': 'The mask zeroing out prompt tokens before the loss is summed.',
  'fn-sum-1': 'Adds the masked loss across every generated token.',
  'traj-9': 'The trajectory whose mask supplies the token count in the denominator.',
  'var-resp-mask-2': 'The 0/1 mask, summed to count how many tokens the model generated.',
  'fn-sum-2': 'Counts the generated tokens, turning the sum into an average.',
  'var-kl-pen-1': 'A penalty for how far the policy has drifted from the reference model.',
  'fn-compute-kl': 'Computes the divergence between the current and reference policy.',
  'var-total-loss-1': 'The full training loss: masked policy loss plus a weighted KL penalty.',
  'var-masked-loss-2': 'The policy loss averaged over generated tokens, added to the KL term.',
  'var-total-loss-2': 'The masked policy loss plus the weighted KL penalty, backpropagated from here.',
  'fn-backward': 'Runs backpropagation, computing gradients from the total loss.',
  'agent-6': 'The policy, receiving the gradient update.',
  'fn-step': "Applies the computed gradients, actually updating the policy's weights.",
}

// Clusters of blanks where physical position carries no meaning — a tuple
// destructure, a return value, or a function's argument list. Any open slot
// in the group accepts whichever of the group's remaining terms you're
// currently looking for; see accepts() below. Argument lists whose order is
// fixed by the callee (clamp's value vs. its bounds) are deliberately absent.
const GROUPS = [
  ['param-issue-2', 'arg-file-tree'], // reset(issue, file_tree)
  ['var-stdout-1', 'var-submitted-1'], // stdout, submitted = ...
  ['state-5', 'action-3'], // .append((state, action))
  ['arg-hidden-tests', 'arg-syntax-errors', 'arg-runtime'], // grade(...)
  ['traj-5', 'reward-4'], // return trajectory, reward
  ['traj-3', 'reward-2'], // for trajectory, reward in rollouts
  ['var-surr1-2', 'var-surr2-2'], // min(surr1, surr2) — genuinely symmetric
  ['traj-11', 'reward-5', 'var-baseline-3'], // def update_policy(...) signature
  ['traj-12', 'reward-6', 'var-baseline-4'], // update_policy(...) call site
  ['var-ratio-2', 'adv-3'], // ratio * advantage — commutative
  ['param-beta', 'var-kl-pen-2'], // beta * kl_penalty — commutative
  ['agent-5', 'var-ref-policy', 'traj-10'], // compute_kl_divergence(...) args
]

// Flavor text for grouped blanks, keyed by term rather than by slot — a
// group's terms can land in either physical slot, so the note has to follow
// the term, not the id, or it'll describe the wrong thing after a swap.
// Indexes line up with GROUPS above.
const GROUP_NOTES = [
  {
    issue: 'The issue text, passed in to seed the initial state.',
    file_tree: 'The starting file layout, passed in alongside the issue.',
  },
  {
    stdout: "The sandbox's console output from this step.",
    submitted: 'Whether the agent has finished the task by this step.',
  },
  {
    State: 'The state at this step, stored alongside the action taken.',
    Action: 'The action taken at this step, stored alongside the state.',
  },
  {
    hidden_tests: 'The held-out tests the final patch is checked against.',
    syntax_errors: "The penalty term for code that doesn't even parse.",
    runtime: 'The penalty term for code that runs too slowly.',
  },
  {
    Trajectory: 'The full step history, handed back to the caller.',
    Reward: 'The final score, handed back alongside the trajectory.',
  },
  {
    Trajectory: "One rollout's full step history, pulled from the group.",
    Reward: "That rollout's final score, pulled out alongside its trajectory.",
  },
  {
    surr1: 'The unclipped surrogate, compared against the clipped one.',
    surr2: 'The clipped surrogate, compared against the unclipped one.',
  },
  {
    Trajectory: 'The rollout this call will compute a loss for.',
    Reward: "That rollout's own score, needed to work out its advantage.",
    baseline: "The group's mean reward, needed to work out the advantage.",
  },
  {
    Trajectory: 'The step history of the rollout this iteration is scoring.',
    Reward: 'The final score of the rollout this iteration is scoring.',
    baseline: 'The shared group baseline, passed into every call this loop makes.',
  },
  {
    ratio: 'The current-vs-sampling probability ratio, multiplied by the advantage.',
    Advantage: "This rollout's advantage, weighting the unclipped objective.",
  },
  {
    beta: 'The weight controlling how strongly the KL penalty is enforced.',
    kl_penalty: 'The divergence from the reference model, scaled by beta and added to the loss.',
  },
  {
    Agent: 'The current policy, being compared against the reference.',
    ref_policy: 'The frozen reference model the policy is penalized for drifting away from.',
    Trajectory: 'The trajectory the divergence is measured over.',
  },
]

function groupIndexOf(id) {
  return GROUPS.findIndex((g) => g.includes(id))
}

function groupOf(id) {
  return GROUPS.find((g) => g.includes(id)) || null
}

// The flavor text for whatever term is (or would be) at this id. Grouped
// blanks look the note up by term, since the physical slot alone doesn't
// say what's in it after an order-flexible swap.
function noteFor(id, term) {
  const idx = groupIndexOf(id)
  return idx === -1 ? LOCATION_NOTES[id] : GROUP_NOTES[idx][term]
}

// What a still-empty blank would accept right now: its own term if ungrouped,
// or whichever of its group's terms are still unplaced. Used both to check a
// tap and to describe what the user actually landed on after a miss.
function pendingTerms(id, revealed) {
  const group = groupOf(id)
  if (!group) return [OCC[id]]
  const needed = group.map((gid) => OCC[gid])
  group.forEach((gid) => {
    const assigned = revealed[gid]
    if (assigned) {
      const idx = needed.indexOf(assigned)
      if (idx !== -1) needed.splice(idx, 1)
    }
  })
  return needed
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

function buildQueue(ids) {
  return shuffle(ids.map((id) => OCC[id]))
}

// Two independent dimensions: which part of the script (stage), and whether
// you're drilling function/method names or everything else (mode). Every id
// is either a function (prefixed fn-) or a variable/argument/literal.
const STAGE_IDS = {
  rollout: Object.keys(ROLLOUT_OCC),
  loss: Object.keys(LOSS_OCC),
}
const FN_IDS = Object.keys(OCC).filter((id) => id.startsWith('fn-'))
const VAR_IDS = Object.keys(OCC).filter((id) => !id.startsWith('fn-'))

function idsFor(stage, mode) {
  const stageIds = STAGE_IDS[stage]
  const modeIds = mode === 'functions' ? FN_IDS : VAR_IDS
  const modeSet = new Set(modeIds)
  return stageIds.filter((id) => modeSet.has(id))
}

function Blank({ value, wrong, highlight, onTap }) {
  const classes = value
    ? 'bg-emerald-400/10 border-emerald-400/50 text-emerald-400 cursor-pointer hover:bg-emerald-400/20'
    : wrong
    ? 'bg-red-400/10 border-red-400/50 text-red-400 cursor-pointer'
    : highlight
    ? 'bg-sky-400/20 border-sky-400 text-sky-300 cursor-pointer'
    : 'bg-amber-400/10 border-amber-400/40 text-amber-400 cursor-pointer hover:bg-amber-400/20'
  return (
    <span
      onClick={onTap}
      className={`inline-block px-2 mx-0.5 rounded border font-semibold select-none transition-colors ${classes}`}
    >
      {value || '\u00A0\u00A0\u00A0\u00A0'}
    </span>
  )
}

function Group({ children }) {
  return (
    <span className="inline-flex items-center border border-dashed border-slate-600 rounded px-1 mx-0.5">
      {children}
    </span>
  )
}

function Line({ num, indent = 0, children }) {
  const pad = indent === 1 ? 'pl-6' : indent === 2 ? 'pl-12' : ''
  return (
    <div className="flex whitespace-pre px-5">
      <span className="w-7 flex-shrink-0 text-slate-600 select-none">{num}</span>
      <span className={`text-slate-100 ${pad}`}>{children}</span>
    </div>
  )
}

export default function CodingAgentRLQuiz() {
  const [stage, setStage] = useState('rollout') // 'rollout' | 'loss'
  const [mode, setMode] = useState('variables') // 'functions' | 'variables'
  const activeIds = idsFor(stage, mode)
  const activeSet = new Set(activeIds)
  const activeTotal = activeIds.length

  const [queue, setQueue] = useState(() => buildQueue(idsFor('rollout', 'variables')))
  const [revealedTerm, setRevealedTerm] = useState({})
  const [wrongIds, setWrongIds] = useState(new Set())
  const [highlightIds, setHighlightIds] = useState(new Set())
  const [mistakes, setMistakes] = useState(0)
  const [guesses, setGuesses] = useState(0)
  // Two independent slots. The last real guess stays put until the next real
  // guess; the answer slot is whatever was last looked up, whether that came
  // from a miss or from re-tapping a blank that's already filled.
  const [lastGuess, setLastGuess] = useState(null) // { term, note, ok } | null
  const [answerInfo, setAnswerInfo] = useState(null) // { term, note } | null

  const currentTerm = queue[0]
  const done = queue.length === 0
  const foundCount = Object.keys(revealedTerm).length

  // Would tapping this (still-empty) blank correctly accept the given term?
  // Ungrouped blanks need their own exact term. Grouped blanks accept any
  // term the group still needs, regardless of which slot you tap.
  function accepts(id, term, revealed) {
    return pendingTerms(id, revealed).includes(term)
  }

  function missedTerm(id, term) {
    setMistakes((m) => m + 1)

    const correctIds = activeIds.filter(
      (oid) => !revealedTerm[oid] && accepts(oid, term, revealedTerm)
    )
    // No timer — this stays lit until the next tap replaces or clears it.
    setHighlightIds(new Set(correctIds))

    // Send it to the back of the deck instead of dropping it — the round
    // isn't done until every blank has actually been filled correctly.
    setQueue((q) => [...q.slice(1), term])

    return correctIds
  }

  // Tapping a blank that's already filled just re-reads it: no guess, no miss,
  // no change to the deck, and no effect on the last guess or its highlights.
  // Only the Answer card changes.
  function reviewFilled(id) {
    const term = revealedTerm[id]
    setAnswerInfo({ term, note: noteFor(id, term) })
  }

  function handleTap(id) {
    if (revealedTerm[id]) {
      reviewFilled(id)
      return
    }
    if (done) return
    const term = currentTerm
    setGuesses((g) => g + 1)
    const ok = accepts(id, term, revealedTerm)
    // Clear any red highlight from a previous wrong guess as soon as a new
    // tap comes in — a fresh miss (below) replaces it with the new one.
    setWrongIds(ok ? new Set() : new Set([id]))

    if (ok) {
      // Correct: the guess is the answer, so the Answer card has nothing left
      // to add and resets until the next miss or re-tap fills it.
      setHighlightIds(new Set())
      setLastGuess({ ok: true, term, note: noteFor(id, term) })
      setAnswerInfo(null)
      setRevealedTerm((prev) => ({ ...prev, [id]: term }))
      setQueue((q) => q.slice(1))
    } else {
      // Incorrect: one card for what you actually tapped, one for what you
      // were looking for and where it belongs. In a partly-filled group the
      // slot's canonical term may already be placed, so describe the term
      // that slot is still waiting for instead.
      const correctIds = missedTerm(id, term)
      const answerId = correctIds[0]
      const clickedTerm = pendingTerms(id, revealedTerm)[0]
      setLastGuess({ ok: false, term: clickedTerm, note: noteFor(id, clickedTerm) })
      setAnswerInfo(answerId ? { term, note: noteFor(answerId, term) } : null)
    }
  }

  function startRound(newStage, newMode) {
    setStage(newStage)
    setMode(newMode)
    setQueue(buildQueue(idsFor(newStage, newMode)))
    setRevealedTerm({})
    setWrongIds(new Set())
    setHighlightIds(new Set())
    setMistakes(0)
    setGuesses(0)
    setLastGuess(null)
    setAnswerInfo(null)
  }

  const b = (id) =>
    activeSet.has(id) ? (
      <Blank
        key={id}
        value={revealedTerm[id]}
        wrong={wrongIds.has(id)}
        highlight={highlightIds.has(id)}
        onTap={() => handleTap(id)}
      />
    ) : (
      <span key={id} className="text-slate-100">
        {OCC[id]}
      </span>
    )
  const kw = (t) => <span className="text-violet-400">{t}</span>
  const cm = (t) => <span className="text-slate-500">{t}</span>

  // Each card greys out only while it has nothing to show.
  const guessTone = !lastGuess ? 'text-slate-500' : lastGuess.ok ? 'text-emerald-400' : 'text-red-400'
  const answerTone = answerInfo ? 'text-sky-400' : 'text-slate-500'

  return (
    <div className="min-h-screen bg-slate-950 flex justify-center px-4 sm:px-5 py-6 sm:py-10">
      <div className="w-full max-w-xl">
        <p className="text-sky-400 text-xs tracking-wide mb-2">training a coding agent with GRPO</p>
        <h1 className="text-slate-50 text-2xl font-semibold mb-3">Find where each term belongs</h1>

        <div className="flex gap-2 mb-2">
          <button
            onClick={() => startRound('rollout', mode)}
            className={`text-sm font-medium px-3.5 py-2 rounded-md border transition-colors ${
              stage === 'rollout'
                ? 'bg-sky-500/15 border-sky-500 text-sky-300'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            Rollout
          </button>
          <button
            onClick={() => startRound('loss', mode)}
            className={`text-sm font-medium px-3.5 py-2 rounded-md border transition-colors ${
              stage === 'loss'
                ? 'bg-sky-500/15 border-sky-500 text-sky-300'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            Policy loss
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => startRound(stage, 'functions')}
            className={`text-sm font-medium px-3.5 py-2 rounded-md border transition-colors ${
              mode === 'functions'
                ? 'bg-sky-500/15 border-sky-500 text-sky-300'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            Guess functions
          </button>
          <button
            onClick={() => startRound(stage, 'variables')}
            className={`text-sm font-medium px-3.5 py-2 rounded-md border transition-colors ${
              mode === 'variables'
                ? 'bg-sky-500/15 border-sky-500 text-sky-300'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            Guess variables
          </button>
        </div>

        <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-md">
          {mode === 'functions'
            ? 'Guess the functions and methods; everything else is shown.'
            : 'Guess the RL concepts, arguments, and variables; every function call is shown.'}{' '}
          A miss highlights the right spot and comes back later. Dashed boxes are order-flexible.
        </p>

        {!done ? (
          <div className="sticky top-0 z-10 bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs mb-1">Tap a blank that is</p>
              <p className="text-sky-400 text-xl font-semibold break-all">{currentTerm}</p>
            </div>
            <p className="text-slate-500 text-xs whitespace-nowrap pl-3">
              {foundCount} / {activeTotal} found
            </p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-emerald-400/50 rounded-xl px-5 py-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-emerald-400 text-lg font-semibold mb-1">All blanks filled</p>
              <p className="text-slate-500 text-xs">
                {guesses} guess{guesses === 1 ? '' : 'es'} total ·{' '}
                {mistakes === 0 ? 'no misses' : `${mistakes} miss${mistakes === 1 ? '' : 'es'}`}
              </p>
            </div>
            <button
              onClick={() => startRound(stage, mode)}
              className="flex items-center gap-1.5 border border-slate-700 text-slate-100 text-sm font-medium px-3.5 py-2 rounded-md"
            >
              <RotateCcw className="w-4 h-4" />
              Play again
            </button>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border-b border-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="ml-2 text-xs text-slate-400 font-mono">train_code_agent.py</span>
          </div>
          <div
            className="py-4 font-mono text-xs sm:text-sm leading-loose overflow-auto"
            style={{ maxHeight: 480 }}
          >
            <Line num={1}>
              {b('env-1')} = {b('fn-create-sandbox')}({b('kwarg-image')}='{b('lit-pyver')}')
            </Line>
            <Line num={2}>
              {b('agent-1')} = {b('fn-load-policy')}({b('arg-checkpoint')})
            </Line>
            <Line num={3}> </Line>
            <Line num={4}>
              {kw('def')} {b('fn-rollout-1')}({b('param-issue-1')}):
            </Line>
            <Line num={5} indent={1}>
              {b('state-1')} = {b('env-2')}.{b('fn-reset')}(
              <Group>
                {b('param-issue-2')}, {b('arg-file-tree')}
              </Group>
              )
            </Line>
            <Line num={6} indent={1}>
              {b('traj-1')} = []
            </Line>
            <Line num={7} indent={1}>
              {kw('for')} t {kw('in')} range({b('arg-max-steps')}):
            </Line>
            <Line num={8} indent={2}>
              {b('action-1')} = {b('agent-2')}.{b('fn-generate')}({b('state-2')})
            </Line>
            <Line num={9} indent={2}>
              <Group>
                {b('var-stdout-1')}, {b('var-submitted-1')}
              </Group>{' '}
              = {b('env-3')}.{b('fn-exec')}({b('action-2')})
            </Line>
            <Line num={10} indent={2}>
              {b('state-3')} += {b('var-stdout-2')} {cm('# stack trace feeds the next step')}
            </Line>
            <Line num={11} indent={2}>
              {b('traj-2')}.{b('fn-append')}((
              <Group>
                {b('state-5')}, {b('action-3')}
              </Group>
              ))
            </Line>
            <Line num={12} indent={2}>
              {kw('if')} {b('var-submitted-2')}: {kw('break')}
            </Line>
            <Line num={13} indent={1}>
              {b('reward-1')} = {b('fn-grade')}(
              <Group>
                {b('arg-hidden-tests')}, {b('arg-syntax-errors')}, {b('arg-runtime')}
              </Group>
              )
            </Line>
            <Line num={14} indent={1}>
              {kw('return')}{' '}
              <Group>
                {b('traj-5')}, {b('reward-4')}
              </Group>
            </Line>
            <Line num={15}> </Line>
            <Line num={16}>
              {kw('def')} {b('fn-update-policy-1')}(
              <Group>
                {b('traj-11')}, {b('reward-5')}, {b('var-baseline-3')}
              </Group>
              ):
            </Line>
            <Line num={17} indent={1}>
              {b('adv-1')} = {b('reward-3')} - {b('var-baseline-2')}
            </Line>
            <Line num={18} indent={1}>
              {b('var-log-probs-1')} = {b('agent-4')}.{b('fn-evaluate-log-probs')}({b('traj-6')})
            </Line>
            <Line num={19} indent={1}>
              {b('var-ratio-1')} = {b('fn-exp')}({b('var-log-probs-2')} -{' '}
              {b('traj-7')}.{b('var-old-log-probs')})
            </Line>
            <Line num={20} indent={1}> </Line>
            <Line num={21} indent={1}>
              {b('var-surr1')} ={' '}
              <Group>
                {b('var-ratio-2')} * {b('adv-3')}
              </Group>
            </Line>
            <Line num={22} indent={1}>
              {b('var-surr2')} = {b('fn-clamp')}({b('var-ratio-3')}, 1 - {b('param-eps-1')}, 1 +{' '}
              {b('param-eps-2')}) * {b('adv-4')}
            </Line>
            <Line num={23} indent={1}>
              {b('var-policy-loss-1')} = -{b('fn-min')}(
              <Group>
                {b('var-surr1-2')}, {b('var-surr2-2')}
              </Group>
              )
            </Line>
            <Line num={24} indent={1}> </Line>
            <Line num={25} indent={1}>
              {b('var-masked-loss-1')} = ({b('var-policy-loss-2')} * {b('traj-8')}.
              {b('var-resp-mask-1')}).{b('fn-sum-1')}() / {b('traj-9')}.{b('var-resp-mask-2')}.
              {b('fn-sum-2')}()
            </Line>
            <Line num={26} indent={1}> </Line>
            <Line num={27} indent={1}>
              {b('var-kl-pen-1')} = {b('fn-compute-kl')}(
              <Group>
                {b('agent-5')}, {b('var-ref-policy')}, {b('traj-10')}
              </Group>
              )
            </Line>
            <Line num={28} indent={1}>
              {b('var-total-loss-1')} = {b('var-masked-loss-2')} +{' '}
              <Group>
                {b('param-beta')} * {b('var-kl-pen-2')}
              </Group>
            </Line>
            <Line num={29} indent={1}> </Line>
            <Line num={30} indent={1}>
              {b('var-total-loss-2')}.{b('fn-backward')}()
            </Line>
            <Line num={31} indent={1}>
              {b('agent-6')}.{b('fn-step')}()
            </Line>
            <Line num={32}> </Line>
            <Line num={33}>{cm('# GRPO: score each rollout against its own group')}</Line>
            <Line num={34}>
              {b('var-rollouts-1')} = [{b('fn-rollout-2')}({b('param-issue-3')}) {kw('for')} _{' '}
              {kw('in')} range(G)]
            </Line>
            <Line num={35}>
              {b('var-baseline-1')} = mean(r {kw('for')} _, r {kw('in')} {b('var-rollouts-2')})
            </Line>
            <Line num={36}>
              {kw('for')}{' '}
              <Group>
                {b('traj-3')}, {b('reward-2')}
              </Group>{' '}
              {kw('in')} {b('var-rollouts-3')}:
            </Line>
            <Line num={37} indent={1}>
              {b('fn-update-policy-2')}(
              <Group>
                {b('traj-12')}, {b('reward-6')}, {b('var-baseline-4')}
              </Group>
              )
            </Line>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3">
            <p className={`text-sm font-semibold mb-1 ${guessTone}`}>
              Last guess{lastGuess ? ` — ${lastGuess.term}` : ''}
            </p>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              {lastGuess ? lastGuess.note : 'Tap a blank to make your first guess.'}
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3">
            <p className={`text-sm font-semibold mb-1 ${answerTone}`}>
              Answer{answerInfo ? ` — ${answerInfo.term}` : ''}
            </p>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              {answerInfo ? answerInfo.note : 'Tap a filled blank to re-read what sits there.'}
            </p>
          </div>
        </div>

        {done && (
          <div className="mt-6 border-t border-slate-800 pt-5">
            <p className="text-slate-500 text-xs mb-3">
              {stage === 'rollout' ? 'What each RL concept is here' : 'What each math term is here'}
            </p>
            <dl className="space-y-2.5">
              {(stage === 'rollout' ? ROLLOUT_MAPPING : LOSS_MAPPING).map(([term, gloss]) => (
                <div key={term} className="flex flex-col sm:flex-row sm:gap-3">
                  <dt className="text-sky-400 text-sm font-semibold sm:w-28 sm:flex-shrink-0">
                    {term}
                  </dt>
                  <dd className="text-slate-400 text-sm leading-relaxed">{gloss}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </div>
  )
}
