"""Gera quadros-chave 3D (com mapeamento atômico) para as reações animadas.

Cada reação é uma lista de quadros; cada quadro é uma lista de fragmentos em
SMILES com mapa atômico. Átomos pesados (e os H que mudam de lugar) são
mapeados explicitamente; os demais H são atribuídos automaticamente ao seu
átomo pesado. Os quadros são embutidos em 3D (ETKDG + MMFF) e alinhados entre
si (Kabsch) para que a animação mova cada átomo o mínimo possível.
"""
import itertools
import json
import sys

import numpy as np
from rdkit import Chem
from rdkit.Chem import AllChem

SEED = 7


def parse(smi):
    p = Chem.SmilesParserParams()
    p.removeHs = False
    m = Chem.MolFromSmiles(smi, p)
    if m is None:
        raise ValueError(smi)
    return Chem.AddHs(m)


def conformers(mh, n=30):
    ps = AllChem.ETKDGv3()
    ps.randomSeed = SEED
    cids = list(AllChem.EmbedMultipleConfs(mh, n, ps))
    if not cids:
        ps.useRandomCoords = True
        cids = list(AllChem.EmbedMultipleConfs(mh, max(4, n // 4), ps))
    try:
        if AllChem.MMFFHasAllMoleculeParams(mh):
            AllChem.MMFFOptimizeMoleculeConfs(mh, maxIters=2000)
        else:
            AllChem.UFFOptimizeMoleculeConfs(mh, maxIters=2000)
    except Exception:
        pass
    return [np.array(mh.GetConformer(c).GetPositions()) for c in cids]


def embed(mh, score=None):
    if mh.GetNumAtoms() == 1:
        return np.zeros((1, 3))
    best, bpos = -1e9, None
    for P in conformers(mh, 12):
        s = score(P) if score else np.sqrt(((P - P.mean(0)) ** 2).sum(1).mean())
        if s > best:
            best, bpos = s, P
    return bpos


def embed_near(mh, keep, ref_pts):
    """Confôrmero que melhor encaixa nos átomos 'keep'; esses átomos são colados na referência."""
    B = np.array(ref_pts)
    best, bpos = None, None
    for P in conformers(mh, 30):
        A = P[keep]
        R, t = kabsch(A, B)
        Q = P @ R.T + t
        rmsd = np.sqrt(((Q[keep] - B) ** 2).sum(1).mean())
        if best is None or rmsd < best:
            best, bpos = rmsd, Q
    bpos[keep] = B
    # relaxa os átomos livres com campo de força, mantendo os presos fixos
    from rdkit.Geometry import Point3D
    conf = mh.GetConformer(0) if mh.GetNumConformers() else None
    if conf is not None:
        for i, p in enumerate(bpos):
            conf.SetAtomPosition(i, Point3D(*map(float, p)))
        cid = conf.GetId()
        try:
            if AllChem.MMFFHasAllMoleculeParams(mh):
                ff = AllChem.MMFFGetMoleculeForceField(mh, AllChem.MMFFGetMoleculeProperties(mh), confId=cid)
            else:
                ff = AllChem.UFFGetMoleculeForceField(mh, confId=cid)
            for i in keep:
                ff.AddFixedPoint(int(i))
            ff.Minimize(maxIts=5000)
            bpos = np.array(mh.GetConformer(cid).GetPositions())
        except Exception as e:
            print("    (sem relaxamento: %s)" % e, file=sys.stderr)
    return bpos, best


def kabsch(P, Q):
    """Rotação R e translação t que levam P sobre Q (Q ≈ P@R.T + t)."""
    pc, qc = P.mean(0), Q.mean(0)
    if len(P) < 3:
        return np.eye(3), qc - pc
    H = (P - pc).T @ (Q - qc)
    U, S, Vt = np.linalg.svd(H)
    d = np.sign(np.linalg.det(Vt.T @ U.T))
    D = np.diag([1, 1, d])
    R = Vt.T @ D @ U.T
    return R, qc - pc @ R.T


class Frame:
    def __init__(self, spec):
        self.spec = spec
        self.blend = spec.get("blend")
        self.frags = []  # list of dict(ids, el, pos, bonds, charges)


def _names(mh):
    names = [None] * mh.GetNumAtoms()
    for a in mh.GetAtoms():
        if a.GetAtomMapNum():
            names[a.GetIdx()] = "m%d" % a.GetAtomMapNum()
    for a in mh.GetAtoms():
        if a.GetAtomMapNum():
            k = 0
            for nb in a.GetNeighbors():
                if nb.GetAtomicNum() == 1 and not nb.GetAtomMapNum():
                    names[nb.GetIdx()] = "h%d.%d" % (a.GetAtomMapNum(), k)
                    k += 1
    if None in names:
        raise ValueError("átomo sem nome")
    return names


def neighbor_sets(mh, names):
    return {names[a.GetIdx()]: frozenset(names[n.GetIdx()] for n in a.GetNeighbors())
            for a in mh.GetAtoms()}


def build_frame(spec, ref=None, ref_nbrs=None, score=None):
    """ref: posições do quadro vizinho já posicionado; ref_nbrs: vizinhanças nele."""
    fr = Frame(spec)
    if fr.blend:
        return fr
    for smi in spec["frags"]:
        mh = parse(smi)
        names = _names(mh)
        nb = neighbor_sets(mh, names)
        pos = None
        if ref is not None and all(n in ref_nbrs and nb[n] == ref_nbrs[n] for n in names):
            pos = np.array([ref[n] for n in names])  # mesma ligação: cópia exata
        elif ref is not None:
            # átomos cuja vizinhança (e a dos vizinhos) não muda ficam parados
            keep = [i for i, n in enumerate(names)
                    if n in ref_nbrs and nb[n] == ref_nbrs[n]
                    and all(m in ref_nbrs and nb[m] == ref_nbrs[m] for m in nb[n])]
            if len(keep) >= 3:
                pos, rmsd = embed_near(mh, keep, [ref[names[i]] for i in keep])
                print("    %s: %d/%d átomos presos, rmsd %.2f" % (smi[:40], len(keep), len(names), rmsd),
                      file=sys.stderr)
        if pos is None:
            pos = embed(mh, score=score)
        bonds = [(names[b.GetBeginAtomIdx()], names[b.GetEndAtomIdx()], b.GetBondTypeAsDouble())
                 for b in mh.GetBonds()]
        fr.frags.append(dict(
            ids=names,
            el=[a.GetSymbol() for a in mh.GetAtoms()],
            pos=pos,
            bonds=bonds,
            nbrs=nb,
            charges={names[a.GetIdx()]: a.GetFormalCharge() for a in mh.GetAtoms()},
            heavy=[names[a.GetIdx()] for a in mh.GetAtoms()
                   if a.GetAtomicNum() > 1 or a.GetAtomMapNum()],
            hgroups=_hgroups(mh, names),
        ))
    return fr


def frame_nbrs(fr):
    d = {}
    for f in fr.frags:
        d.update(f["nbrs"])
    return d


def _hgroups(mh, names):
    g = {}
    for a in mh.GetAtoms():
        hs = [names[n.GetIdx()] for n in a.GetNeighbors()
              if n.GetAtomicNum() == 1 and not n.GetAtomMapNum()]
        if len(hs) > 1:
            g[names[a.GetIdx()]] = hs
    return g


def frame_positions(fr):
    d = {}
    for f in fr.frags:
        for n, p in zip(f["ids"], f["pos"]):
            d[n] = p
    return d


def align_frag(f, ref):
    ids = f["ids"]
    P = f["pos"]
    idx = {n: i for i, n in enumerate(ids)}
    pts = [n for n in f["heavy"] if n in ref]
    if len(pts) < 3:
        pts = [n for n in ids if n in ref]
    A = np.array([P[idx[n]] for n in pts])
    B = np.array([ref[n] for n in pts])
    R, t = kabsch(A, B)
    P = P @ R.T + t
    # troca H equivalentes (ex.: CH3) para minimizar o deslocamento
    for heavy, hs in f["hgroups"].items():
        hs_ref = [h for h in hs if h in ref]
        if len(hs_ref) != len(hs):
            continue
        cur = [P[idx[h]].copy() for h in hs]
        best, bperm = None, None
        for perm in itertools.permutations(range(len(hs))):
            s = sum(np.sum((cur[perm[i]] - ref[hs[i]]) ** 2) for i in range(len(hs)))
            if best is None or s < best:
                best, bperm = s, perm
        for i, h in enumerate(hs):
            P[idx[h]] = cur[bperm[i]]
    # ajuste final com todos os átomos
    allp = [n for n in ids if n in ref]
    A = np.array([P[idx[n]] for n in allp])
    B = np.array([ref[n] for n in allp])
    R, t = kabsch(A, B)
    f["pos"] = P @ R.T + t


def separate(fr, sep):
    if sep is None:
        return
    allpos = np.vstack([f["pos"] for f in fr.frags])
    c = allpos.mean(0)
    seps = sep if isinstance(sep, list) else [sep] * len(fr.frags)
    for f, s in zip(fr.frags, seps):
        if not s:
            continue
        v = f["pos"].mean(0) - c
        n = np.linalg.norm(v)
        v = v / n if n > 1e-6 else np.array([1.0, 0, 0])
        f["pos"] = f["pos"] + v * s


def dock(fr, spec):
    """Posiciona fragmentos de um quadro-âncora relativo ao fragmento 0."""
    base = frame_positions(fr)
    for d in spec:
        f = fr.frags[d["frag"]]
        idx = {n: i for i, n in enumerate(f["ids"])}
        tgt = base[d["target"]]
        frm = base[d["dir_from"]]
        u = tgt - frm
        u /= np.linalg.norm(u)
        P = f["pos"] - f["pos"][idx[d["atom"]]]
        # orienta o fragmento para "fora" ao longo de u
        cen = P.mean(0)
        if np.linalg.norm(cen) > 1e-6:
            a = cen / np.linalg.norm(cen)
            v = np.cross(a, u)
            s, cth = np.linalg.norm(v), np.dot(a, u)
            if s > 1e-6:
                vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
                R = np.eye(3) + vx + vx @ vx * ((1 - cth) / s ** 2)
                P = P @ R.T
        f["pos"] = P + tgt + u * d["dist"]
        base = frame_positions(fr)


def build_reaction(spec):
    a = spec["anchor"]
    specs = spec["frames"]
    frames = [None] * len(specs)
    frames[a] = build_frame(specs[a])
    if spec.get("far"):
        # escolhe, entre vários confôrmeros, o que afasta os pares pedidos
        best = None
        for seed in range(1, 30):
            global SEED
            old_seed, SEED = SEED, seed
            fr = build_frame(specs[a])
            SEED = old_seed
            pos = frame_positions(fr)
            s = sum(np.linalg.norm(pos[x] - pos[y]) for x, y in spec["far"])
            if best is None or s > best[0]:
                best = (s, fr)
        frames[a] = best[1]
    fa = frames[a]
    if specs[a].get("dock"):
        dock(fa, specs[a]["dock"])
    order = list(range(a + 1, len(specs))) + list(range(a - 1, -1, -1))
    for k in order:
        if specs[k].get("blend"):
            frames[k] = Frame(specs[k])
            continue
        step = -1 if k > a else 1
        r = k + step
        while specs[r].get("blend"):
            r += step
        ref_fr = frames[r]
        fr = build_frame(specs[k], frame_positions(ref_fr), frame_nbrs(ref_fr))
        ref = frame_positions(ref_fr)
        for f in fr.frags:
            align_frag(f, ref)
        separate(fr, specs[k].get("sep"))
        frames[k] = fr

    # lista global de átomos (ordem do quadro-âncora)
    ids, el = [], {}
    for f in fa.frags:
        for n, e in zip(f["ids"], f["el"]):
            ids.append(n)
            el[n] = e
    gi = {n: i for i, n in enumerate(ids)}

    pos_frames, bond_frames, charge_frames = [], [], []
    for fr in frames:
        if fr.blend:
            pos_frames.append(None)
            bond_frames.append(None)
            charge_frames.append(None)
            continue
        d = frame_positions(fr)
        missing = set(ids) ^ set(d)
        if missing:
            raise ValueError("átomos divergentes entre quadros: %s" % sorted(missing))
        pos_frames.append(np.array([d[n] for n in ids]))
        b, c = {}, {}
        for f in fr.frags:
            for x, y, o in f["bonds"]:
                key = tuple(sorted((gi[x], gi[y])))
                b[key] = o
            c.update(f["charges"])
        bond_frames.append(b)
        charge_frames.append([c[n] for n in ids])

    for k, fr in enumerate(frames):
        if fr.blend:
            i, j, t = fr.blend
            pos_frames[k] = pos_frames[i] * (1 - t) + pos_frames[j] * t
            bond_frames[k] = bond_frames[i]
            charge_frames[k] = charge_frames[i]

    # centraliza e orienta (PCA de todos os quadros)
    allp = np.vstack(pos_frames)
    c = pos_frames[a].mean(0)
    X = allp - c
    _, _, Vt = np.linalg.svd(X, full_matrices=False)
    R = Vt
    if np.linalg.det(R) < 0:
        R[2] *= -1
    pos_frames = [(p - c) @ R.T for p in pos_frames]
    return ids, el, pos_frames, bond_frames, charge_frames


def pack(ids, el, pos_frames, bond_frames, charge_frames):
    keys = sorted(set().union(*[set(b) for b in bond_frames]))
    bonds = [[i, j, [b.get((i, j), 0) for b in bond_frames]] for i, j in keys]
    names = {n[1:]: i for i, n in enumerate(ids) if n.startswith("m")}
    return dict(
        el=[el[n] for n in ids],
        frames=[[round(float(v), 2) for v in p.flatten()] for p in pos_frames],
        bonds=bonds,
        charges=charge_frames,
        names=names,
    )


# ---------------------------------------------------------------- reações
SARC = "[CH3:7][N:6]([H:10])[CH2:8][C:9](=[O:16])[O-:17]"
REACTIONS = {
    "creatina": dict(anchor=2, frames=[
        {"frags": ["[N:1]#[C:2][NH2:3]", SARC], "sep": 4.5},
        {"frags": ["[N:1]#[C:2][NH2:3]", SARC], "sep": 0.9},
        {"frags": ["[N-:1]=[C:2]([NH2:3])[N+:6]([H:10])([CH3:7])[CH2:8][C:9](=[O:16])[O-:17]"]},
        {"frags": ["[N:1]([H:10])=[C:2]([NH2:3])[N:6]([CH3:7])[CH2:8][C:9](=[O:16])[O-:17]"]},
    ]),
    "dcd": dict(anchor=3, frames=[
        {"frags": ["[N:1]#[C:2][NH2:3]", "[N:6]#[C:7][N-:8][H:9]", "[H+:10]"], "sep": 4.0},
        {"frags": ["[N:1]#[C:2][NH2:3]", "[N:6]#[C:7][N-:8][H:9]", "[H+:10]"], "sep": [0.9, 0.9, 0]},
        {"frags": ["[N:6]#[C:7][N:8]([H:9])[C:2](=[N-:1])[NH2:3]", "[H+:10]"], "sep": [0, 2.6]},
        {"frags": ["[N:6]#[C:7][N:8]=[C:2]([NH2:3])[N:1]([H:9])[H:10]"]},
    ]),
    "creatinina": dict(anchor=2, frames=[
        {"frags": ["[N:1]([H:10])=[C:2]([N:3]([H:4])[H:5])[N:6]([CH3:7])[CH2:8][C:9](=[O:16])[O:17][H:18]"]},
        {"blend": [0, 2, 0.6]},
        {"frags": ["[N:1]([H:10])=[C:2]1[N+:3]([H:4])([H:5])[C:9]([O-:16])([O:17][H:18])[CH2:8][N:6]1[CH3:7]"]},
        {"frags": ["[N:1]([H:10])=[C:2]1[N:3]([H:4])[C:9]([O-:16])([O+:17]([H:18])[H:5])[CH2:8][N:6]1[CH3:7]"]},
        {"frags": ["[N:1]([H:10])=[C:2]1[N:3]([H:4])[C:9](=[O:16])[CH2:8][N:6]1[CH3:7]",
                   "[O:17]([H:18])[H:5]"], "sep": 1.4},
        {"frags": ["[N:1]([H:10])([H:4])[C:2]1=[N:3][C:9](=[O:16])[CH2:8][N:6]1[CH3:7]",
                   "[O:17]([H:18])[H:5]"], "sep": 2.6},
    ]),
    "hidrolise": dict(anchor=2, frames=[
        {"frags": ["[CH3:1][CH:2]([CH3:3])[CH2:4][C@H:5]([NH2:6])[C:7](=[O:8])[N:9]([H:20])[CH2:10][C:11](=[O:12])[OH:13]",
                   "[O:14]([H:21])[H:22]"], "sep": 4.0},
        {"frags": ["[CH3:1][CH:2]([CH3:3])[CH2:4][C@H:5]([NH2:6])[C:7](=[O:8])[N:9]([H:20])[CH2:10][C:11](=[O:12])[OH:13]",
                   "[O:14]([H:21])[H:22]"], "sep": 0.8},
        {"frags": ["[CH3:1][CH:2]([CH3:3])[CH2:4][C@H:5]([NH2:6])[C:7]([O:8][H:22])([O:14][H:21])[N:9]([H:20])[CH2:10][C:11](=[O:12])[OH:13]"]},
        {"frags": ["[CH3:1][CH:2]([CH3:3])[CH2:4][C@H:5]([NH2:6])[C:7](=[O:8])[O:14][H:21]",
                   "[H:22][N:9]([H:20])[CH2:10][C:11](=[O:12])[OH:13]"], "sep": 0.9},
        {"frags": ["[CH3:1][CH:2]([CH3:3])[CH2:4][C@H:5]([NH2:6])[C:7](=[O:8])[O:14][H:21]",
                   "[H:22][N:9]([H:20])[CH2:10][C:11](=[O:12])[OH:13]"], "sep": 3.2},
    ]),
    "carnosina": dict(anchor=2, frames=[
        {"frags": ["[NH2:1][CH2:2][CH2:3][C:4](=[O:5])[O:6][H:30]",
                   "[NH:7]([H:31])[C@@H:8]([CH2:12][c:13]1[cH:17][nH:16][cH:15][n:14]1)[C:9](=[O:10])[OH:11]"], "sep": 4.0},
        {"frags": ["[NH2:1][CH2:2][CH2:3][C:4](=[O:5])[O:6][H:30]",
                   "[NH:7]([H:31])[C@@H:8]([CH2:12][c:13]1[cH:17][nH:16][cH:15][n:14]1)[C:9](=[O:10])[OH:11]"], "sep": 0.8},
        {"frags": ["[NH2:1][CH2:2][CH2:3][C:4]([O:5][H:31])([O:6][H:30])[NH:7][C@@H:8]([CH2:12][c:13]1[cH:17][nH:16][cH:15][n:14]1)[C:9](=[O:10])[OH:11]"]},
        {"frags": ["[NH2:1][CH2:2][CH2:3][C:4](=[O:5])[NH:7][C@@H:8]([CH2:12][c:13]1[cH:17][nH:16][cH:15][n:14]1)[C:9](=[O:10])[OH:11]",
                   "[O:6]([H:30])[H:31]"], "sep": 1.0},
        {"frags": ["[NH2:1][CH2:2][CH2:3][C:4](=[O:5])[NH:7][C@@H:8]([CH2:12][c:13]1[cH:17][nH:16][cH:15][n:14]1)[C:9](=[O:10])[OH:11]",
                   "[O:6]([H:30])[H:31]"], "sep": 3.0},
    ]),
    "tampao": dict(anchor=2, far=[("m14", "m11"), ("m14", "m10"), ("m14", "m1")], frames=[
        {"frags": ["[NH3+:1][CH2:2][CH2:3][C:4](=[O:5])[NH:7][C@@H:8]([CH2:12][c:13]1[cH:17][nH:16][cH:15][n:14]1)[C:9](=[O:10])[O-:11]",
                   "[OH2+:20][H:40]"], "sep": 4.0},
        {"frags": ["[NH3+:1][CH2:2][CH2:3][C:4](=[O:5])[NH:7][C@@H:8]([CH2:12][c:13]1[cH:17][nH:16][cH:15][n:14]1)[C:9](=[O:10])[O-:11]",
                   "[OH2+:20][H:40]"], "sep": 0.7},
        {"frags": ["[NH3+:1][CH2:2][CH2:3][C:4](=[O:5])[NH:7][C@@H:8]([CH2:12][c:13]1[cH:17][nH:16][cH:15][n+:14]1[H:40])[C:9](=[O:10])[O-:11]",
                   "[OH2:20]"],
         "dock": [{"frag": 1, "atom": "m20", "target": "m40", "dir_from": "m14", "dist": 1.75}]},
        {"frags": ["[NH3+:1][CH2:2][CH2:3][C:4](=[O:5])[NH:7][C@@H:8]([CH2:12][c:13]1[cH:17][nH:16][cH:15][n+:14]1[H:40])[C:9](=[O:10])[O-:11]",
                   "[OH2:20]"], "sep": 3.0},
    ]),
}


# --------------------------------------------- cafeína × adenosina (custom)
ADO = ("[NH2:10][c:6]1[n:1][cH:2][n:3][c:4]2[c:5]1[n:7][cH:8][n:9]2"
       "[C@@H:11]3[O:12][C@H:13]([CH2:14][OH:15])[C@@H:16]([OH:17])[C@H:18]3[OH:19]")
CAF = ("[CH3:112][n:101]1[c:102](=[O:110])[n:103]([CH3:113])[c:104]2"
       "[c:105]([n:107]([CH3:114])[cH:108][n:109]2)[c:106]1=[O:111]")


def caffeine_adenosine():
    fa = build_frame({"frags": [ADO]}).frags[0]
    fc = build_frame({"frags": [CAF]}).frags[0]
    ia = {n: i for i, n in enumerate(fa["ids"])}
    ic = {n: i for i, n in enumerate(fc["ids"])}
    ring_a = ["m%d" % k for k in range(1, 10)]
    ring_c = ["m%d" % (100 + k) for k in range(1, 10)]
    A = fa["pos"].copy()
    C = fc["pos"].copy()
    # orienta a adenosina: anel no plano xy, centro do anel na origem
    ra = np.array([A[ia[n]] for n in ring_a])
    rc0 = ra.mean(0)
    _, _, Vt = np.linalg.svd(ra - rc0)
    R = Vt.copy()
    if np.linalg.det(R) < 0:
        R[2] *= -1
    A = (A - rc0) @ R.T
    # a ribose fica para baixo (-y)
    rib = A[ia["m11"]]
    ang = np.arctan2(rib[0], -rib[1])
    Rz = np.array([[np.cos(ang), -np.sin(ang), 0], [np.sin(ang), np.cos(ang), 0], [0, 0, 1]])
    A = A @ Rz.T
    # cafeína sobreposta ao anel da adenosina
    Pc = np.array([C[ic[n]] for n in ring_c])
    Qa = np.array([A[ia[n]] for n in ring_a])
    Rk, t = kabsch(Pc, Qa)
    Cov = C @ Rk.T + t  # sobreposta (anel na origem)

    ids = fa["ids"] + fc["ids"]
    el = fa["el"] + fc["el"]

    def frame(ado_off, caf_off):
        return np.vstack([A + ado_off, Cov + caf_off])

    P = np.array([0.0, -0.4, 0.0])  # centro do "bolso" do receptor
    frames = [
        frame(np.array([-5.2, 0, 0]), np.array([5.2, 0, 0])),
        frame(np.array([0.0, 0, 0]), np.array([0.0, 0, 1.8])),
        frame(P, np.array([8.5, 1.5, 0])),
        frame(np.array([-8.5, 1.5, 0]), P),
    ]
    bonds = {}
    off = len(fa["ids"])
    for f, o in ((fa, 0), (fc, off)):
        loc = {n: i for i, n in enumerate(f["ids"])}
        for x, y, order in f["bonds"]:
            bonds[tuple(sorted((loc[x] + o, loc[y] + o)))] = order
    bond_frames = [bonds] * len(frames)
    ch = [0] * len(ids)
    pk = pack(ids, {n: e for n, e in zip(ids, el)}, frames, bond_frames, [ch] * len(frames))
    pk["pocket"] = [float(v) for v in P]
    return pk


def main(out):
    data = {}
    for k, spec in REACTIONS.items():
        data[k] = pack(*build_reaction(spec))
        print(k, len(data[k]["el"]), "átomos,", len(data[k]["frames"]), "quadros", file=sys.stderr)
    data["cafeina"] = caffeine_adenosine()
    print("cafeina", len(data["cafeina"]["el"]), "átomos", file=sys.stderr)
    with open(out, "w") as fh:
        json.dump(data, fh, separators=(",", ":"))


if __name__ == "__main__":
    main(sys.argv[1])
