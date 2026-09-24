#!/bin/bash
agent-browser inject <<'EOFJS'
const srsData = {
  "reckon": {"state":"review","lapses":0,"ef":2.5,"ivl":3,"due":1790310639573,"reps":2,"hist":[]},
  "stubborn": {"state":"review","lapses":0,"ef":2.5,"ivl":3,"due":1790310639573,"reps":2,"hist":[]},
  "overwhelmed": {"state":"review","lapses":0,"ef":2.5,"ivl":3,"due":1790310639573,"reps":2,"hist":[]},
  "reach-out": {"state":"review","lapses":0,"ef":2.5,"ivl":3,"due":1790310639573,"reps":2,"hist":[]},
  "make-up-for": {"state":"review","lapses":0,"ef":2.5,"ivl":3,"due":1790310639573,"reps":2,"hist":[]},
  "the": {"state":"review","lapses":0,"ef":2.5,"ivl":3,"due":1790310639573,"reps":2,"hist":[]},
  "of": {"state":"review","lapses":0,"ef":2.5,"ivl":3,"due":1790310639573,"reps":2,"hist":[]},
  "and": {"state":"review","lapses":0,"ef":2.5,"ivl":3,"due":1790310639573,"reps":2,"hist":[]},
  "to": {"state":"review","lapses":0,"ef":2.5,"ivl":3,"due":1790310639573,"reps":2,"hist":[]},
  "a": {"state":"review","lapses":0,"ef":2.5,"ivl":3,"due":1790310639573,"reps":2,"hist":[]},
  "in": {"state":"review","lapses":0,"ef":2.5,"ivl":3,"due":1790310639573,"reps":2,"hist":[]},
  "for": {"state":"review","lapses":0,"ef":2.5,"ivl":3,"due":1790310639573,"reps":2,"hist":[]},
  "on": {"state":"review","lapses":0,"ef":2.5,"ivl":3,"due":1790310639573,"reps":2,"hist":[]},
  "that": {"state":"review","lapses":0,"ef":2.5,"ivl":3,"due":1790310639573,"reps":2,"hist":[]},
  "by": {"state":"review","lapses":0,"ef":2.5,"ivl":3,"due":1790310639573,"reps":2,"hist":[]},
  "this": {"state":"review","lapses":2,"ef":2.5,"ivl":3,"due":1790310639573,"reps":2,"hist":[]},
  "with": {"state":"review","lapses":2,"ef":2.5,"ivl":3,"due":1790310639573,"reps":2,"hist":[]},
  "i": {"state":"review","lapses":2,"ef":2.5,"ivl":3,"due":1790310639573,"reps":2,"hist":[]},
  "you": {"state":"review","lapses":2,"ef":2.5,"ivl":3,"due":1790310639573,"reps":2,"hist":[]},
  "it": {"state":"review","lapses":2,"ef":2.5,"ivl":3,"due":1790310639573,"reps":2,"hist":[]}
};
localStorage.setItem('eng.srs.v2', JSON.stringify(srsData));
console.log('Seeded eng.srs.v2 with 20 words');
EOFJS
