#!/usr/bin/env python3
"""Synthesize a VALID TigerPunks curation-config for testing gen_data.py.
Mirrors tigerpunks/rules.js (hair/hat matrix, hoodie/bunny, jason, ape/tiger/npc).
Usage: python3 gen_test_config.py [N] [seed]
"""
import json, os, sys, random

ROOT     = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
manifest = json.load(open(os.path.join(ROOT, "..", "tigerpunks", "manifest.json")))
MODES = manifest["modes"]; PUNK = manifest["punk"]; CATS = manifest["categories"]
def cat(cid): return next(c for c in CATS if c["id"] == cid)

# ---- rules (ported from tigerpunks/rules.js) ----
ONLY_WITH = {
  "Bob": ["Cap Backward","Cap Foreward Blue","Cap Foreward","Cap Purple","Crown","Fedora","G.I","Head Band","Police Cap","Tiara"],
  "Crazy Hair": ["Crown","Head Band","Tiara"], "Wild": ["Crown","Head Band","Tiara"], "Flat Top": ["Crown","Head Band","Tiara"],
}
NOT_WITH = {
  "Long Hair":["Bandana","Bunny","Do rag","Pilot Helmet","Tassle Hat"],
  "Longer Hair Dark":["Bandana","Bunny","Do rag","Pilot Helmet","Tassle Hat"],
  "Longer Hair":["Bandana","Bunny","Do rag","Pilot Helmet","Tassle Hat"],
  "Mohawk":["Bandana","Bunny","Cap Backward","Cap Foreward Blue","Cap Foreward","Cap Purple","Do rag","Pilot Helmet","Tassle Hat","Propeller Hat"],
  "Normal Popper":["Bandana","Bunny","Do rag","Pilot Helmet","Tassle Hat"],
  "Popper":["Bandana","Bunny","Do rag","Pilot Helmet","Tassle Hat"],
}
PUNK_EXCLUDE = {
  "ape":{"Hair":["Long Hair","Longer Hair Dark","Longer Hair"]},
  "tiger":{"Hat":["Tassle Hat"]}, "white-tiger":{"Hat":["Tassle Hat"]},
  "npc":{"Mouth":["Smirk"]},
}
def hair_hat_ok(hair, hat):
    if not hair or not hat: return True
    if hair in ONLY_WITH: return hat in ONLY_WITH[hair]
    if hair in NOT_WITH:  return hat not in NOT_WITH[hair]
    return True
def top_suppressed(hat): return hat == "Hoodie"
def misc_suppressed(hat): return hat in ("Hoodie", "Bunny")
def misc_ok(m, hat): return not (hat and m == "Jason Mask")
def punk_ok(pid, cid, label):
    ex = PUNK_EXCLUDE.get(pid)
    return not (ex and cid in ex and label in ex[cid])

N    = int(sys.argv[1]) if len(sys.argv) > 1 else 80
SEED = int(sys.argv[2]) if len(sys.argv) > 2 else 1234
rng  = random.Random(SEED)
PRES = {"Eye":0.9,"Hair":0.9,"Beard":0.5,"Mouth":0.6,"Hat":0.7,"Top":0.65,"Misc":0.4}

def opts(cid, pid, filt=None):
    o = [x["label"] for x in cat(cid)["options"] if punk_ok(pid, cid, x["label"])]
    if filt: o = [x for x in o if filt(x)]
    return o

def gen(pid_force=None, hat_force=None):
    pid = pid_force or rng.choice(PUNK["options"])["id"]
    plabel = next(p["label"] for p in PUNK["options"] if p["id"] == pid)
    a = {"Mode": rng.choice(MODES)["label"], "Punk": plabel}
    # Hat
    if hat_force is not None:
        a["Hat"] = hat_force
    else:
        ho = opts("Hat", pid)
        a["Hat"] = rng.choice(ho) if (rng.random() < PRES["Hat"] and ho) else "None"
    hat = a["Hat"] if a["Hat"] != "None" else None
    # Hair (compat with hat)
    hr = opts("Hair", pid, lambda l: hair_hat_ok(l, hat))
    a["Hair"] = rng.choice(hr) if (rng.random() < PRES["Hair"] and hr) else "None"
    # Beard, Mouth, Eye
    for cid in ("Beard","Mouth","Eye"):
        o = opts(cid, pid)
        a[cid] = rng.choice(o) if (rng.random() < PRES[cid] and o) else "None"
    # Top (suppressed under hoodie)
    if top_suppressed(hat): a["Top"] = "None"
    else:
        o = opts("Top", pid); a["Top"] = rng.choice(o) if (rng.random() < PRES["Top"] and o) else "None"
    # Misc (suppressed under hoodie/bunny; no jason with hat; punk excl)
    if misc_suppressed(hat): a["Misc"] = "None"
    else:
        picks = [x for x in opts("Misc", pid, lambda l: misc_ok(l, hat)) if rng.random() < PRES["Misc"]]
        a["Misc"] = " + ".join(picks) if picks else "None"
    return a

# force edge cases up front
forced = [
    dict(pid_force="tiger"),                 # tiger -> tiger-variant art, no tassle
    dict(pid_force="white-tiger"),
    dict(hat_force="Hoodie"),                # hoodie -> no top, no misc
    dict(hat_force="Bunny"),                 # bunny -> no misc
    dict(pid_force="ape"),                   # ape -> no long hairs
    dict(pid_force="npc"),                   # npc -> no smirk
    dict(pid_force="tiger", hat_force="Hoodie"),
]
out = []
for i in range(N):
    a = gen(**forced[i]) if i < len(forced) else gen()
    out.append({"index": i + 1, "seed": rng.randint(0, 10**9), "attributes": a})

cfg = {"collection":"TigerPunks","kind":"curation-config","size":N,"masterSeed":SEED,"set":out}
json.dump(cfg, open(os.path.join(ROOT, "data", "test-config.json"), "w"), indent=2)
print(f"wrote data/test-config.json ({N} tokens, seed {SEED})")
