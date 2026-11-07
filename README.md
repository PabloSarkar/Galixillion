# Cosmillion

A space-themed rare-answer trivia game. Each round asks a question with many valid answers.
**The less popular your answer is, the more points you get**, and those points fuel your rocket
from the launchpad past the clouds, the Moon and Mars, all the way out to interstellar space.

## Play

Open `index.html` in a browser. No build step and no server needed.

## How scoring works

- Each question has a list of accepted answers. Each answer has an estimated popularity, the share of players who would give it.
- Points = `100 × log2(100 / popularity%)`, clamped to 10–1000. Halving an answer's popularity adds 100 points.
- Answers that aren't on the chart score nothing, but you can keep trying until the 30-second timer runs out.
  Small typos are forgiven.
- 8 rounds per flight. Your best score is saved in the browser.

## Files

- `index.html`: the page layout
- `style.css`: styling, including a phone layout
- `game.js`: game loop, answer matching, scoring and the rocket scene drawn on a canvas
- `questions.js`: questions, answers and popularity estimates. Add your own here.
