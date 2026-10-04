import illustrationSizes from "./rule-illustration-sizes.json"
import { FishingIllustration } from "./FishingIllustration"

// Composed illustrations exported from the original Figma instruction frames.
function RuleIllustration(props: {
  name: keyof typeof illustrationSizes
  description: string
  inline?: boolean
}) {
  return (
    <figure class="rules-illustration" classList={{ "rules-illustration-inline": props.inline }}>
      <img
        src={`/assets/rules/${props.name}.png`}
        width={illustrationSizes[props.name].width}
        height={illustrationSizes[props.name].height}
        alt={props.description}
      />
    </figure>
  )
}
// Copy, paragraph boundaries and lists follow Figma inst1–inst6, including the Riichi continuation.
export function RulesContent() {
  return (
    <div class="rules-content">
      <div class="rules-chapter" role="region" aria-labelledby="basic-rules">
        <h3 id="basic-rules">Basic game</h3>
        <p>
          <em>for 2 - 6 players</em>
        </p>
        <section>
          <h4>Goal</h4>
          <p>Finish the game with the most chips.</p>
          <p>
            Each round, build a hand of 6 cards by fishing, choose which cards to reveal, and bet.
            Win the pot by having the strongest hand or making everyone else fold.
          </p>
          <p>
            After each round, pass the dealer stick clockwise, skipping eliminated players. The game
            ends when the stick reaches or passes the starting dealer.
          </p>
          <h5>Setup</h5>
          <RuleIllustration
            name="starting-chips"
            description="The 200 starting chips and the dealer stick."
          />
          <ul>
            <li>
              Give each player chips worth <strong>200.</strong>
            </li>
            <li>
              Choose a <em>dealer</em> at random and give them the <em>dealer stick.</em> Remember
              this starting seat to track the end of the game.
            </li>
            <li>
              Keep the <em>Basic Hand Ladder</em> where everyone can see it.
            </li>
          </ul>
          <p>Use 102 cards: three copies of each card shown below.</p>
          <div class="rules-setup-illustrations">
            <RuleIllustration
              name="card-families"
              description="Winds: North, East, West, South. Bams: 1–9 and Green Dragon. Craks: 1–9 and Red Dragon. Dots: 1–9 and Blue Dragon."
            />
          </div>
          <h5>Start a round</h5>
          <ol>
            <li>
              Everyone pays <strong>5 chips</strong> into the middle. This is the <em>ante.</em> The
              chips you are playing for are the <em>pot.</em>
            </li>
            <li>
              Shuffle the deck and deal everyone <strong>6 cards,</strong> kept hidden.
            </li>
            <li>
              Put the deck face-down in the middle. Turn over 2 cards beside it, one to start each{" "}
              <em>discard lane.</em>
            </li>
          </ol>
        </section>
        <section>
          <h4>Play the three streets</h4>
          <p>
            Each round has three betting stages, called <em>streets.</em>
          </p>
          <p>
            On street 1, keep all 6 cards hidden. Before betting on streets 2 and 3, everyone still
            in secretly chooses and simultaneously reveals 2, then 2 cards.
          </p>
          <p>Revealed cards stay yours but cannot be exchanged or discarded.</p>
          <p>After street 3, reveal your last 2 cards and compare hands.</p>
          <h5>Betting</h5>
          <p>The dealer starts street 1.</p>
          <p>
            On later streets, whoever last bet in the previous street starts. If nobody bet, the
            dealer starts. If the starting player has folded, start with the next player clockwise
            who is still in.
          </p>
          <p>
            Take turns clockwise, skipping players who have folded. On your turn, choose one action:
          </p>
          <ul>
            <li>
              <strong>Check:</strong> If there is no bet to match, pay nothing. You may fish once.
            </li>
            <li>
              <strong>Call:</strong> Match the current bet. You may fish once.
            </li>
            <li>
              <strong>Bet:</strong> Set the first bet or increase it. You do not fish.
            </li>
            <li>
              <strong>Fold:</strong> Leave the round. Chips you have already paid stay in the pot.
              You may play the next round if you can pay the ante.
            </li>
          </ul>
          <p>Finish any fishing before the next player acts or the next street begins.</p>
          <p>
            Keep this street’s payments in front of you so everyone can see your total. When you
            call or bet, add only the difference.
          </p>
          <p>
            If nobody bets, the street ends after everyone has checked or folded once. After a bet,
            everyone else still in must respond, including anyone who already checked. They may
            call, bet higher or fold. Each increase gives the others another turn to respond.
          </p>
          <p>
            Once everyone still in has matched the final bet, move the payments into the pot. Start
            the next street with no bet; previous payments do not count toward it.
          </p>
          <p>If only one player remains, they win the pot immediately.</p>
          <p class="rules-example">
            <em>
              Example: Alice Checks and fishes. Bob Bets 10. Carla Calls 10. Alice Bets to 20. Bob
              and Carla each add 10. Betting ends, and Alice goes first in the next street.
            </em>
          </p>
        </section>
        <section>
          <h4>Fishing</h4>
          <FishingIllustration />
          <ol>
            <li>
              <strong>Take a card</strong> from the top of the face-down deck or the end of either
              discard lane. From a lane, you may only take its most recently discarded card.
            </li>
            <li>
              <strong>Discard a hidden card</strong> face-up at the end of either lane. If a lane is
              empty, you must discard there. You may discard the card you just took.
            </li>
          </ol>
          <p>
            Arrange each lane as a face-up row, adding new discards to the end. Only the last card
            in the row can be taken; removing it makes the previous card available.
          </p>
          <p>
            Revealed cards cannot be discarded. You finish fishing with{" "}
            <strong>six cards in total,</strong> counting both hidden and revealed cards.
          </p>
          <h5>All-in</h5>
          <p>
            When you bet or call with your last chips, say <strong>“All-in.”</strong> You may do
            this even if you cannot afford a full call.
          </p>
          <p>
            Your total payment for this street sets the most anyone still in must pay. Players still
            in who have paid more take back the difference. Chips from earlier streets and folded
            players stay in the pot.
          </p>
          <p class="rules-example">
            <em>
              Example: Alice has paid 40 this street. Bob can pay only 25 and goes all-in. The
              maximum becomes 25, so Alice takes back 15.
            </em>
          </p>
          <p>
            From now on, nobody may bet or raise. Continue clockwise: players who have paid less
            must call or fold. Each call includes one fishing action unless the caller has declared
            Riichi. Callers may also spend one Riichi stick under the usual per-turn limit, even if
            the call uses their last chips. If someone calls with their last chips and pays less
            again, lower everyone’s payment to that amount and return the difference.
          </p>
          <p>
            Once payments and the final fishing action are settled, everyone still in reveals all
            six cards. Compare hands and award the pot. Skip the remaining streets, even if a refund
            gave someone chips back. If everyone but one player folds, that player wins immediately.
          </p>
          <h5>Running out of chips</h5>
          <p>
            If you cannot pay the full ante, or paying the ante would leave you at 0 chips, you are
            out for the rest of this game. Keep any remaining chips for your final score.
          </p>
          <p>If only one player remains, the game ends.</p>
        </section>
        <section>
          <h4>End of a round</h4>
          <ul>
            <li>
              <strong>If everyone else folds:</strong> You win the pot without showing your cards.
            </li>
            <li>
              <strong>If two or more players remain:</strong> Reveal all cards. Use up to 4 of your
              6 cards to make your best combination on the Hand Ladder. You may use any of your
              cards, including those kept hidden. The highest-ranked hand wins the pot.
            </li>
          </ul>
          <p>
            If hands have the same rank, compare the defining cards. For Two Eyes, compare the
            stronger pair first, then the other pair. Within each combination, compare cards from
            highest to lowest. The first difference wins.
          </p>
          <p>
            <em>When comparing cards:</em> Winds rank above Dragons, then numbers from 9 down to 1.
            All Winds have equal value, as do all Dragons. Matching numbers are equal regardless of
            suit.
          </p>
          <p>
            <em>If the strongest hands still tie,</em> split the pot equally among those players.
            Unused cards do not break the tie. Leave any chips that cannot be divided equally in the
            pot for the next round.
          </p>
          <h5>End of the game</h5>
          <p>
            Pass the dealer stick clockwise, skipping eliminated players. If it returns to the
            player who dealt first, or passes their seat because they were eliminated, the game
            ends.
          </p>
          <p>When the game ends, count your chips. Most chips wins. Equal totals share the win.</p>
          <h5>Tournament</h5>
          <p>For a longer game, agree to play a tournament of 2, 3 or 4 games before starting.</p>
          <table>
            <thead>
              <tr>
                <th scope="col">Game</th>
                <th scope="col">Starting chips</th>
                <th scope="col">Ante</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>200</td>
                <td>5</td>
              </tr>
              <tr>
                <td>2</td>
                <td>400</td>
                <td>10</td>
              </tr>
              <tr>
                <td>3</td>
                <td>600</td>
                <td>15</td>
              </tr>
              <tr>
                <td>4</td>
                <td>800</td>
                <td>20</td>
              </tr>
            </tbody>
          </table>
          <p>
            After each game, write down everyone's score and return all chips. Give everyone the
            next game's starting amount, including eliminated players.
          </p>
          <p>
            Add the game scores at the end of the tournament. Highest total wins; equal totals share
            the win.
          </p>
        </section>
      </div>
      <div class="rules-chapter" role="region" aria-labelledby="riichi-rules">
        <h3 id="riichi-rules">Riichi expansion</h3>
        <p>Add these rules to the Basic Game for more ways to improve your hand and bluff.</p>
        <section>
          <h4>Setup</h4>
          <RuleIllustration name="riichi-sticks" description="Riichi sticks" />
          <ul>
            <li>
              Add the 4 <em>Jokers</em> and 4 <em>Blanks</em> to the deck (110 cards total).
            </li>
            <li>
              Give each player{" "}
              <strong>
                2 <em>riichi sticks.</em>
              </strong>{" "}
              Keep the remaining Riichi sticks and all loan sticks in the supply.
            </li>
            <li>
              Use the <strong>Advanced hand ladder.</strong>
            </li>
          </ul>
          <h5>Loans</h5>
          <RuleIllustration name="loan-sticks" description="Loan sticks" />
          <p>
            If you cannot afford the full ante, take one loan stick and <strong>200</strong> chips,
            then pay the ante. During Charleston, you may also choose a loan if you have fewer than
            100 chips. Both use the same one-loan allowance per game. If you cannot afford a later
            ante after taking your loan, you are eliminated for the rest of that game.
          </p>
          <p>
            If you took a loan, subtract <strong>250</strong> chips from your remaining chips at the
            end of the game. This is your score, even if negative.
          </p>
          <p>In a tournament, use the loan amounts and penalties below.</p>
          <table>
            <thead>
              <tr>
                <th scope="col">Game</th>
                <th scope="col">Chips per loan</th>
                <th scope="col">Deduct per loan stick</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>200</td>
                <td>250</td>
              </tr>
              <tr>
                <td>2</td>
                <td>400</td>
                <td>500</td>
              </tr>
              <tr>
                <td>3</td>
                <td>600</td>
                <td>750</td>
              </tr>
              <tr>
                <td>4</td>
                <td>800</td>
                <td>1000</td>
              </tr>
            </tbody>
          </table>
          <p>
            After each game, record your score after loan penalties, then return all loan sticks to
            the supply. Loans do not carry over to the next game. Highest combined score wins the
            tournament.
          </p>
          <h5>Charleston</h5>
          <p>
            After dealing, everyone secretly chooses 2 cards and passes them face-down to the player
            on their left. Choose your cards before looking at those you receive.
          </p>
          <p>Do this once at the start of each round, before betting.</p>
        </section>
        <section>
          <h4>Jokers</h4>
          <RuleIllustration name="jokers" description="The 4 jokers" />
          <p>Each Joker can stand for one card:</p>
          <ul>
            <li>
              <strong>Green:</strong> any Bam or Green Dragon
            </li>
            <li>
              <strong>Blue:</strong> any Dot or Blue Dragon
            </li>
            <li>
              <strong>Red:</strong> any Crak or Red Dragon
            </li>
            <li>
              <strong>Black:</strong> any Wind
            </li>
          </ul>
          <p>
            Jokers can only be used in combinations of <strong>3 or more cards.</strong> They cannot
            complete a pair, even within a larger hand.
          </p>
          <h5>Blanks</h5>
          <RuleIllustration name="blanks" description="The 4 blanks" />
          <p>
            When fishing, you may swap a hidden Blank for{" "}
            <strong>any card in either discard lane,</strong> not just the last card. Leave the
            Blank in its place.
          </p>
          <p>
            This replaces your entire fishing action: do not draw or discard another card. Blanks
            have no hand value.
          </p>
        </section>
        <section>
          <h4>Spend Riichi sticks</h4>
          <p>
            Once per turn, after checking, calling or betting, you may return 1 Riichi stick to the
            supply to fish once more.
          </p>
          <ul>
            <li>
              <strong>After a check or call:</strong> This gives you a second fishing action.
            </li>
            <li>
              <strong>After a bet:</strong> This lets you fish despite the bet.
            </li>
          </ul>
          <p>
            Finish each fishing action before starting another. You can use the second action to
            take a card uncovered by the first.
          </p>
          <p>
            You cannot spend sticks after folding or while in Riichi. Calling an all-in still allows
            a stick, even if the call uses your last chips. An all-in Bet gives no fishing.
          </p>
          <p>
            In a tournament, keep your remaining Riichi sticks between games. Before the next game,
            each player receives 2 more sticks, added to those they kept.
          </p>
          <h5>Declare Riichi</h5>
          <RuleIllustration
            name="declare-riichi"
            description="Win after declaring Riichi to earn 2 sticks."
          />
          <p>
            On streets 1 or 2, immediately after you bet, you may declare Riichi if nobody else is
            in Riichi. Declare before fishing or spending a stick. Calling does not qualify.
          </p>
          <p>
            Take 2 Riichi sticks from the supply and place them on your hidden cards. You earn them
            only if you win the pot alone.
          </p>
          <p>
            Your hand is locked: you cannot fish, swap blanks or spend sticks. Reveal cards as
            usual. You may still check, call, bet or fold.
          </p>
          <ul>
            <li>
              <strong>Win the pot alone:</strong> Keep the reward sticks, including if everyone else{" "}
              <em>folds.</em>
            </li>
            <li>
              <strong>Lose, tie or Fold:</strong> Return them to the supply.
            </li>
          </ul>
          <p>If you Fold, another player may declare Riichi after a later Bet.</p>
          <p>
            If your Bet uses your last chips, you may declare Riichi before anyone responds to your
            all-in.
          </p>
        </section>
      </div>
    </div>
  )
}
