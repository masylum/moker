import { cpSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { expect, it } from "vitest"
import { applyRuleVariants } from "../scripts/lib/rule-variants"
import { HAND_RANKS } from "../src/game/hand-ranks"

it("executes Long Chow scoring, bot fishing, Twin Lotus, and scaled settlements in an isolated engine", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "moker-rule-test-"))
  try {
    cpSync(resolve("src/game"), join(sandbox, "game"), { recursive: true })
    symlinkSync(resolve("node_modules"), join(sandbox, "node_modules"), "dir")
    writeFileSync(join(sandbox, "package.json"), '{"type":"module"}')
    const ranks = {
      ...HAND_RANKS,
      "long-chow": 10,
      "three-dragons-eye": 11,
      "four-winds": 12,
      kong: 13,
    }
    writeFileSync(
      join(sandbox, "game/hand-ranks.ts"),
      `export const HAND_RANKS = ${JSON.stringify(ranks)}; export function handRank(k, mode) {return mode === "basic" ? ({pung:7,"three-winds":6,"three-dragons":8,"four-winds":9}[k] ?? HAND_RANKS[k]) : HAND_RANKS[k]}`,
    )
    applyRuleVariants(join(sandbox, "game"), true, true)
    const probe = `
      import assert from "node:assert/strict";
      import {createDeck} from "./game/cards.ts";
      import {scoreHand, compareHandScores} from "./game/scoring.ts";
      import {analyzeHandProgress} from "./game/hand-progress.ts";
      import {GameEngine} from "./game/engine.ts";
      import {stepHeuristic} from "./game/automation.ts";
      import {chooseHeuristicAction, chooseHeuristicDiscard, analyzePokerMath} from "./game/heuristic.ts";
      const deck=createDeck(), pick=id=>deck.find(c=>c.id===id);
      const run=(s,start,count=5)=>Array.from({length:count},(_,i)=>pick(s+"-"+(start+i)+"-1"));
      const kind=cards=>scoreHand(cards).combinations[0]?.kind;
      for(const suit of ["bamboo","characters","dots"]) for(let start=1;start<=5;start++) {
        const cards=run(suit,start);
        assert.equal(kind(cards),"long-chow"); assert.equal(scoreHand(cards).total,10);
        assert.equal(scoreHand(cards,"basic").combinations[0]?.kind,"chow");
        const joker=deck.find(c=>c.kind==="joker"&&c.color===cards[0].color);
        for(let i=0;i<5;i++) assert.equal(kind(cards.map((c,j)=>i===j?joker:c)),"long-chow");
      }
      assert.notEqual(kind([...run("bamboo",1,4),pick("dots-5-1")]),"long-chow");
      assert.notEqual(kind([...run("bamboo",1,4),pick("joker-red")]),"long-chow");
      assert.notEqual(kind([...run("bamboo",1,4),pick("bamboo-4-2")]),"long-chow");
      assert.notEqual(kind([...run("bamboo",6,4),pick("bamboo-1-1")]),"long-chow");
      assert.equal(analyzeHandProgress(run("bamboo",1,4)).find(h=>h.kind==="long-chow").missing,1);
      assert.equal(analyzeHandProgress(run("bamboo",1),"basic").some(h=>h.kind==="long-chow"),false);
      const dragons=["red","green","white"].map(c=>pick("dragon-"+c+"-1"));
      assert(compareHandScores(scoreHand(run("bamboo",1)),scoreHand(dragons))>0);
      assert(compareHandScores(scoreHand(run("bamboo",1)),scoreHand([...dragons,pick("dots-9-1"),pick("dots-9-2")]))<0);
      assert(compareHandScores(scoreHand(run("bamboo",5)),scoreHand(run("dots",4)))>0);
      const players=[1,2,3,4].map(n=>({id:"p"+n,name:"P"+n,controller:"heuristic"}));
      const fixture=()=>{const g=GameEngine.create(players,{seed:"long-chow-test",mode:"riichi",heuristicSamples:24});while(g.state.phase==="charleston")stepHeuristic(g);return g;};
      const g=fixture(), p=g.state.players.find(p=>p.id===g.state.actingPlayerId);
      p.privateCards=[...run("bamboo",1,4),pick("dots-8-1"),pick("characters-6-1"),pick("dots-9-1")];p.publicCards=[];
      g.state.discardA=[pick("bamboo-5-1")];g.state.discardB=[pick("characters-1-1")];g.state.charlestonHistory=[];
      const d=chooseHeuristicAction(g.state,p.id,24);assert.notEqual(d.action.type,"fold");if(d.action.type==="bet")assert.equal(d.action.useRiichiStick,true);assert.equal(d.action.drawSource,"discard-a");g.act(p.id,d.action);
      while(g.state.phase==="discarding")g.discard(p.id,chooseHeuristicDiscard(g.state,p.id));assert.equal(kind(p.privateCards),"long-chow");
      const twin=fixture(), tp=twin.state.players.find(p=>p.id===twin.state.actingPlayerId);tp.privateCards.splice(0,2,...deck.filter(c=>c.kind==="flower"));
      assert.equal(analyzePokerMath(twin.state,tp.id,24).showdownEquity,1);
      assert.equal(analyzePokerMath(twin.state,tp.id,24).expectedScore,14);
      const guarded=fixture(), gp=guarded.state.players.find(p=>p.id===guarded.state.actingPlayerId);
      guarded.state.gameNumber=4;guarded.state.config.tournamentGames=4;guarded.state.orbitValue=20;
      guarded.state.handNumber=guarded.state.maxHands;guarded.state.dealerSteps=guarded.state.maxHands-1;
      gp.chips=700;for(const other of guarded.state.players.filter(p=>p!==gp))other.chips=150;
      assert(!chooseHeuristicAction(guarded.state,gp.id,24).rationale.includes("guarantees"));
      for(let game=1;game<=4;game++) {
        const t=fixture();t.state.gameNumber=game;t.state.orbitValue=5*game;
        const winner=t.state.players[(t.state.dealerIndex+3)%4];winner.privateCards=[pick("flower-white-lotus"),...run("bamboo",1),pick("dots-9-1")];winner.publicCards=[];
        for(const other of t.state.players.filter(p=>p!==winner)){other.privateCards=run("dots",1);other.publicCards=[];other.chips=7;}
        while(t.state.phase==="betting")t.act(t.state.actingPlayerId,{type:"fold"});
        assert.equal(t.state.handResults.at(-1).lotusBluff.perOpponent,[15,40,75,120][game-1]);
        assert.equal(t.state.handResults.at(-1).lotusBluff.total,21);
        assert(t.state.players.every(p=>p.loans===0));
      }
      console.log("Long Chow: 15 natural runs, 75 Joker substitutions; Basic exclusions, bot draw, Twin Lotus and four capped Lotus settlements verified");
    `
    writeFileSync(join(sandbox, "probe.ts"), probe)
    const result = spawnSync(process.execPath, ["--import", "tsx", "probe.ts"], {
      cwd: sandbox,
      encoding: "utf8",
      timeout: 30_000,
    })
    expect(result.stderr).toBe("")
    expect(result.status).toBe(0)
  } finally {
    rmSync(sandbox, { recursive: true, force: true })
  }
}, 35_000)
