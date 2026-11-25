# Rules and math

Every formula here has a test. Where a number is a project choice and not derived, it says so.

## Currencies

| Currency | Used for | Earned from |
| --- | --- | --- |
| Points | leaderboard, ledger | challenges, Snake placement |
| Gold | avatar shop (items 75 to 500) | games and quests |
| Diamonds | rewards catalog (75 to 750) | games and quests |

Points to currency for placement and challenge awards (`pointsToCurrency`, tested in `game-math.test.ts`): gold = round(points x 0.5), diamonds = round(points x 0.25), each at least 1.

Per-game conversions in `src/lib/ibs-store.ts` (new personal best only, except Flappy):

| Game | Gold | Diamonds |
| --- | --- | --- |
| Flappy | best: round(score x 0.5), else 1 | best: round(score x 0.25), else 0 |
| Crossy | round(score x 0.5) | round(score x 0.25) |
| Snake | round(score x 2) | round(score x 1) |
| Memory | round(score x 0.3) | round(score x 0.15) |

Not covered by a test: these per-game rates (they live inside store functions that read `localStorage`). The conversion helper above is.

## Scores

- **Trivia Blitz**: 10 questions, 12 s each. Score = 100 per correct answer + round(correct x max(0, 50 - 5 x average seconds)). Maximum 1500.
- **Memory Match**: pairs x 100, minus 5 per move beyond the pair count, minus 2 per whole second, plus a difficulty bonus (Easy 0, Medium 100, Hard 200), never below 0. Hard has 12 pairs, so the maximum is 1400.
- **Snake**: 10 per apple on a 20 x 20 board starting at length 3, so at most (400 - 3) x 10 = 3970.
- **Flappy**: 1 per pipe. **Crossy**: the furthest row reached. Neither has a natural maximum; the server caps are project choices (1000 and 2000).
- **Typing and Typing Race**: see below.

## Typing

- **WPM** = (correct characters / 5) per minute. Correct characters are the length of each completed word that matches the target, plus its space (`correctCharCount`, `wpmFromChars`). No accuracy discount is applied to WPM.
- **Accuracy** = correct completed words / completed words, rounded; 100 before any word is completed (`accuracyPct`).
- **Race order** (`rankRacers`): finishers by finish time; an exact tie is broken by higher WPM, then higher accuracy, then name. Unfinished racers follow, by progress then WPM. DNF (left mid-race) is last.
- **Server finish detection** uses each racer's finish timestamp; the displayed order uses the function above.

## Leaderboard

Overall rank = all-time points + Flappy, Trivia, Crossy, Snake, Memory and Typing personal bests, highest first. Challenges and All-time rank by all-time points alone; each game has its own board. There is no explicit tiebreak: equal scores keep the member list order. (Not tested.)

## Daily challenges

Personal challenge: 5 to 15 points from a 10-item pool, picked deterministically per member and day. Move challenge: 15 to 25 points from an 8-item pool. Company and group challenges are set by an admin, so their points vary. Awards convert to gold and diamonds with `pointsToCurrency`.

## Anti-cheat bounds (server)

| Bound | Value | Where | Test |
| --- | --- | --- | --- |
| Points per hour, per day | 150, 400 | `earn-budget.ts` | `earn-budget.test.ts`, `edge.spec.ts` |
| Diamonds per hour, per day | 400, 1000 | `earn-budget.ts` | same |
| Redemptions | server price, own account, 3 open, 5 per day | `company/POST.ts` | `edge.spec.ts`, `reward-catalog.test.ts` |
| Trivia, Memory, Snake caps | 1500, 1400, 3970 | `score-caps.ts` | `score-caps.test.ts`, `game-math.test.ts` |
| Typing cap | 350 WPM | `typing-math.ts`, race `progress` | `typing-math.test.ts` |
| Flappy, Crossy caps | 1000, 2000 | `score-caps.ts` | `score-caps.test.ts` |

These slow inflation; they do not prove each point was earned. See [SECURITY.md](SECURITY.md).

## Sources for human limits

- Average typing speed: about 52 WPM, faster groups about 65 WPM, from 168,000 volunteers and 136 million keystrokes. Dhakal, Feit, Kristensson and Oulasvirta, "Observations on Typing from 136 Million Keystrokes", CHI 2018, [doi:10.1145/3173574.3174220](https://doi.org/10.1145/3173574.3174220), [project page](https://userinterfaces.aalto.fi/136Mkeystrokes/).
- Fastest results found: reports of 293 to 305 WPM from unofficial online tests (Monkeytype, 15 s category), for example [Tom's Hardware](https://www.tomshardware.com/news/world-typing-record-mythicalrocket-293wpm) and [Fox News](https://www.foxnews.com/tech/teenage-typing-phenom-hits-insane-305-words-per-minute). These are short bursts on a different test, so 350 WPM is a project choice with headroom, not a proven human limit. Older records (216 and 212 WPM) are on typewriters or disputed.
- Reaction time: mean visual simple reaction time about 231 ms (213 ms after correcting for hardware delay) in 1,469 subjects aged 18 to 65. Woods et al., "Factors influencing the latency of simple reaction time", Frontiers in Human Neuroscience 9:131 (2015), [doi:10.3389/fnhum.2015.00131](https://doi.org/10.3389/fnhum.2015.00131). No game currently enforces a reaction-time bound, so none is claimed.
