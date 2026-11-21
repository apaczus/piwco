# Investing chapter: texts and numbers for team review

Everything the player reads in the investing chapter (month 8, "Stocks and bonds"), in one place. **All texts and numbers are Claude's proposal and wait for team review.** Edit the source file named in each section (JSON = content, no code needed); `.tsx` / `.ts` texts need the programmer.

Placeholders in `{braces}` are filled from the player's own numbers (Try 1 and the engine). Amounts are in PLN.

## 1. Numbers (`packages/content/src/invest.json`)

- Start amount: **10000 PLN**, inflation **5% a year**
- Market history: fixed seed 808 (the same for every player)
- Balanced mix: etf 60%, bonds 30%, deposit 10%
- Horizons (years): [1, 5, 10]; monthly top-ups (PLN): [0, 100, 300, 500]

| Instrument | Yearly returns, years 1–10 | Return / Risk (0–5) |
|---|---|---|
| Keep it on your account | +0%, +0%, +0%, +0%, +0%, +0%, +0%, +0%, +0%, +0% | 0 / 0 |
| Savings deposit | +6%, +6%, +6%, +6%, +6%, +6%, +6%, +6%, +6%, +6% | 1 / 1 |
| Treasury bonds | +6%, +6%, +6%, +6%, +6%, +6%, +6%, +6%, +6%, +6% | 2 / 1 |
| S&P 500 ETF | -5%, +18%, +11%, +9%, +14%, -14%, +16%, +10%, +8%, +15% | 4 / 3 |
| NovaTech shares (one company) | -40%, +35%, -20%, +45%, +10%, -30%, +25%, -10%, +30%, +5% | 5 / 5 |

Pinned market events:

- month 4, stock: -45%, "NovaTech: product recall"
- month 7, etf: -12%, "Markets dip on recession fears"

Results with these numbers (10 000 PLN, nominal / today's money): 1 year: account 10 000 / 9 524, deposit 10 550 / 10 048, bonds 10 650 / 10 143, ETF 9 500 / 9 048, NovaTech 6 000 / 5 714, balanced 9 950 / 9 476. 10 years: account 10 000 / 6 139, deposit 17 081 / 10 486, bonds 18 771 / 11 524, ETF 21 073 / 12 937, NovaTech 11 110 / 6 821, balanced 19 983 / 12 268.

## 2. Instrument cards (`invest.json`)

### Keep it on your account
- One-liner: Money stays on your bank account: always there, never grows.
- What can go wrong ("i"): Nothing drops, but prices rise every year, so the same money buys less.

### Savings deposit
- One-liner: The bank pays you a fixed rate for keeping your money for an agreed time.
- What can go wrong ("i"): The money is frozen for the term: break it early and you lose the interest.

### Treasury bonds
- One-liner: You lend money to the state and get interest, a bit above inflation.
- What can go wrong ("i"): Prices move a little month to month, and selling before maturity can cost a fee.

### S&P 500 ETF
- One-liner: One fund that holds the 500 biggest US companies at once.
- What can go wrong ("i"): The whole market can fall 10–20% in a bad year; it has always recovered, but not always fast.

### NovaTech shares (one company)
- One-liner: A young company with one product, 3 years on the stock exchange.
- What can go wrong ("i"): One bad piece of news can cut the price in half overnight.

## 3. Mission and lesson (`packages/content/src/levels.json`, month 8)

**Mission:** Grow 10 000 PLN without fear

- Invest 10 000 PLN for one year
- Learn what stocks, bonds and ETFs do
- Beat your first try

Reward: Builds your Future tower

**Lesson "Investing basics"** (12 cards):

1. **Info: What is a stock?**  
   A stock is a small piece of a company. You earn when the company grows or pays out part of its profit (a dividend). The risk: the company can struggle, or even go bankrupt.
2. **Info: What is a bond?**  
   You lend money to the state or a company, and they pay you interest. Less risk than stocks, and less profit.
3. **Info: What is an ETF?**  
   One purchase, a whole basket of companies: for example the 500 biggest US companies. Low fees, and no single company can sink you.
4. **Info: Diversification**  
   Don't put all your eggs in one basket. When one company drops, it hurts much less if you own hundreds of them. {yourNovatech}
5. **Choice: Which one gives you better diversification?**  
   Left: NovaTech: One young company with one product, 3 years on the stock exchange.  
   Right: S&P 500 ETF: 500 of the biggest US companies in one fund.  
   Correct: right. Explanation: The ETF spreads your money over 500 companies, so one product recall is a tiny part of it. With NovaTech, its bad news is all your bad news.
6. **Info: The big ETFs**  
   Most people start with an index ETF: one fund that follows a whole market. Four of the best known:
   - S&P 500: 500 biggest US companies
   - Nasdaq-100: US tech giants
   - Dow Jones: 30 US blue chips
   - Russell 2000: 2 000 smaller US companies
   - Read more:
     - Liquidity: how fast you can buy or sell without losing on the price; big ETFs are very liquid.
     - Volume: how much is traded every day; high volume usually means good liquidity.
     - Price: what one share costs right now.
     - Market cap: the price × all shares, so what the whole company is worth.
     - P/E (price to earnings): how many years of today's profit the price equals; high means expensive or big hopes.
     - Dividend yield: the yearly dividend as a % of the price.
     - Volatility: how much the price swings; higher means bigger ups and downs.
7. **Info: Short term vs long term**  
   Over one year anything can happen: big swings, real losses. Over 10 years the good and bad years even out.
   - Visual: {start} in the S&P 500 ETF after 1 year and after 10 years, on the same market as your try
8. **Info: Doing nothing costs money**  
   Prices rise about 5% a year. Money that just sits on your account melts: every year it buys less. Not investing is a choice too, and it costs you.
   - Visual: What your money can buy
9. **Info: Start small, start now**  
   You don't need a lot of money or the right age. 100 PLN a month in a balanced mix grows the same way whether you start at 25, 45 or 65.
   - Visual: 100 PLN a month for 10 years ({monthlyPaid} paid in)
10. **Myth or fact (MYTH):** Investing is only for rich people.  
   Explanation: You can start with 100 PLN a month. Time and regular top-ups matter more than a big start.
11. **Myth or fact (MYTH):** Keeping money on the account is the safest choice in the long run.  
   Explanation: It never drops, but inflation eats it: after 10 years {start} buys what {cashReal10y} buys today.
12. **Myth or fact (MYTH):** A 12% drop means you lost that money for good.  
   Explanation: Only if you sell. In your try the S&P 500 ETF fell 12% in July and won most of it back by December. Over 10 years it more than doubled.

## 4. Screen texts (`apps/mobile/src/invest/InvestFlow.tsx`, programmer)

Top of every screen: "INVESTING · Step n of 11".

- **Intro:** "Your first investment" · "Your company had a good quarter. You have 10 000 PLN you don't need for a year. What do you do with it?" · "TO INVEST 10 000 PLN for 1 year" · "Five ways to keep it, from \"leave it on the account\" to one company's shares. You choose the split." · button "Choose your investments"
- **Split:** "Split your 10 000 PLN" · "Drag the sliders. Whatever you don't place stays on your account. Tap \"i\" to learn more." · "Left to place" · bars "Return" / "Risk" · "What can go wrong" · button "Invest for 1 year"
- **Run:** "One year, fast" / "N years, fast" · "Month k" / "Year y · month k" · "Skip to the end ›" · button "See the result"
- **Result 1:** "Your year is over" · "YOUR 10 000 PLN IS NOW" · "Worth X in today's money (after inflation)" · "Your year vs each option alone" (legend: You, each instrument, Cash after inflation) · "What could have happened": "A balanced mix (60% ETF, 30% bonds, 10% deposit): X", "Best this year: …", "And the balanced mix in 10 years: X" · "What your choice did" (section 5) · button "Learn why"
- **Lesson:** eyebrow "INVESTING · STEP 5 OF 11" · done: "Now try again: you know more than a year ago."
- **Horizon:** "Try again, smarter: how long do you invest?" · "Same 10 000 PLN, same market history. This time you choose the time too." · 1 year "Short time, big swings", 5 years "Time to recover from a bad year", 10 years "Time does the heavy lifting" · warning "Short time, big swings: In one year a bad market can still cost you. Your first try was exactly that."
- **Split again:** "Split your 10 000 PLN again" · button "Invest for N years"
- **Top-up:** "Add a little every month?" · "A monthly top-up is split like your investments. Small amounts add up over time." · "Just the 10 000 PLN" / "X a month" with "X paid in over N years"
- **Result 2:** "Better than your first try!" / "Not better this time" · "Gain in today's money, after what you paid in." · columns Try 1 / Try 2: nominal, "Paid in X", "Today's money X" · "Both tries, same market" · if not better: "Try a longer horizon and a mix: Give it 5 or 10 years, spread the money (an ETF and bonds), and add a little every month." · buttons "See your city" / "Try again" (or "Try again" / "See your city anyway")
- **City:** "AUGUST · YOUR CITY" · "Your Future tower grew!" / "Your Future tower is built!" · "Net worth" · button "See your year"

## 5. Generated sentences (`apps/mobile/src/invest/investSession.ts`, programmer)

Market notifications during the run (only for what the player holds):
- "NovaTech: product recall −45%" / "Markets dip on recession fears −12%" (titles from `invest.json`) + "Your X: A → B."
- Bad years (≤ −12%, from year 2): "Year n: X −14%" + "Your X: A → B. Hold on: the market has bad years too."
- At the end: "Prices rose 5% this year" / "Prices rose 5% a year" + "What cost 100 PLN at the start now costs 105 PLN."

"What your choice did" (2–3 lines, from the data):
- NovaTech ≥ 50%: "You put X% into one company. When NovaTech fell, it took Y with it."
- NovaTech > 0: "NovaTech was X% of your money and lost Y. One company can drop fast."
- Account ≥ 30%: "X sat on your account. Inflation quietly took Y of what it can buy."
- Any ETF: "The S&P 500 ETF dipped 12% in July and climbed back by December. You didn't sell in the dip: good."
- Deposit + bonds ≥ 50%: "Deposit and bonds kept you safe this year: +X. Over 10 years they only just beat inflation."
- Fallback: "One year is short: even good investments can have a bad year."

## 6. Future tower (`packages/content/src/city.json` + `apps/mobile/src/city/buildings.ts`)

- Levels: try1Done, lessonDone, try2Better (in order: Try 1 done → Lv 1, lesson done → Lv 2, Try 2 better in today's money → Lv 3)
- Hints: "Play the investing chapter (August) to build it." · "Level 1 of 3 · Finish the investing lesson to grow it" · "Level 2 of 3 · Beat your first try to build the top" · "Level 3 of 3 · Fully built!" · empty plot "+ Future"

## 7. Before the chapter (`tutorial.json` `howItWorks`, `levels.json`, `onboarding.json`)

**How Piwco works:** How Piwco works · You learn by solving problems · Every level follows the same 3 steps.
- Problem: Something happens: a client pays late, a machine breaks, the market drops.
- Decide: You choose what to do with real numbers. Every choice has a price, and you see it right away.
- Learn: A short swipe lesson explains why it worked or not. Your city grows with every good decision.
- Your year: 12 levels, one money skill each · "You know this" · "Start here"
- You already know the basics (budget, cushion, insurance), so we skip them. You can still play them later.
- Button: Start investing ›

**Knowledge question:** How well do you find your way in finance? · From 1 (just starting) to 5 (I know loans and investing). We'll skip what you already know.
- 1 · I'm just starting
- 2 · I know the very basics
- 3 · I budget and save
- 4 · I know loans and saving products
- 5 · I know loans and investing

4-account screen for 3–5: "Let's check if you use the 4-account rule" · "It matters in personal finance. A quick look at the 4 accounts, then your answers show where you stand."

After the chapter (dashboard): "August done ✓" · "NEXT: September: …, coming soon" · "Play the basics anyway ›" · "See your year". Year map: "Want a quick warm-up?" · "You skipped the basics. Play January anyway: your budget, cash flow and first month in the city."

## 8. Open question for the team: September (leverage)

The lessons doc uses ×30 leverage on a single stock. EU retail clients can't get that (stocks 5:1, major indices 20:1, major FX pairs 30:1). Proposal: **EUR/USD ×30**, a −2% move = −60% of the margin, as an A–D quiz card.
