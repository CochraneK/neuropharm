# -*- coding: utf-8 -*-
"""QA for the flashcard deck:
  1) each rendered card cell contains its expected drug name (generator sanity),
  2) front<->back pairing is correct under long-edge duplex flip,
  3) no text overlaps inside any card,
  4) mono deck is truly grayscale (ink-saver).
Run: python qa_pairing.py [color.pdf] [mono.pdf]
"""
import sys, json
import make_cards as mk

PW, PH = mk.A4
CW, CH = mk.CARD_W, mk.CARD_H
COLS, ROWS = mk.COLS, mk.ROWS
pos = mk.grid_positions()
drugs = json.load(open('drugs.json', encoding='utf-8'))
PER = len(pos)
sets = [drugs[i:i + PER] for i in range(0, len(drugs), PER)]

OVERLAP_AREA = 3.0   # pt^2 threshold considered a real overlap
COLOR_DIFF = 25      # channel spread above which a span counts as colored


def cell_rect(k):
    x, yb = pos[k]
    ytop = PH - yb - CH
    return (x, ytop, x + CW, ytop + CH)


def spans_in_cell(page, k):
    r = cell_rect(k)
    out = []
    d = page.get_text("dict")
    for blk in d["blocks"]:
        if blk.get("type") != 0:
            continue
        for line in blk["lines"]:
            for sp in line["spans"]:
                x0, y0, x1, y1 = sp["bbox"]
                cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
                if r[0] <= cx <= r[2] and r[1] <= cy <= r[3]:
                    out.append((x0, y0, x1, y1, sp["text"], sp.get("color", 0)))
    return out


def overlap_found(spans):
    n = len(spans)
    for i in range(n):
        for j in range(i + 1, n):
            a, b = spans[i][:4], spans[j][:4]
            ix = max(0, min(a[2], b[2]) - max(a[0], b[0]))
            iy = max(0, min(a[3], b[3]) - max(a[1], b[1]))
            if ix * iy > OVERLAP_AREA:
                return (spans[i][4], spans[j][4])
    return None


def is_colorful(spans):
    worst = 0
    for sp in spans:
        col = sp[5]
        if isinstance(col, int) and col >= 0:
            r = (col >> 16) & 255
            g = (col >> 8) & 255
            b = col & 255
            worst = max(worst, max(r, g, b) - min(r, g, b))
    return worst > COLOR_DIFF


def zw_name_in(cell_spans, name):
    blob = ''.join(s[4] for s in cell_spans)
    return name in blob


def qa_file(path, mono):
    import fitz as _fitz
    doc = _fitz.open(path)
    problems = []
    colored_hits = 0
    for si, subset in enumerate(sets):
        n = len(subset)
        fp, bp = 2 * si, 2 * si + 1
        front, back = doc[fp], doc[bp]
        perm = mk._back_perm(n)
        for k in range(n):
            fspan = spans_in_cell(front, k)
            bspan = spans_in_cell(back, k)
            fexp = subset[k]['zh']
            if not zw_name_in(fspan, fexp):
                problems.append(f"P{fp+1} front cell#{k}: '{fexp}' missing (got '{{}}'.format(''.join(s[4] for s in fspan)[:24]))")
            bexp = subset[perm[k]]['zh']
            if not zw_name_in(bspan, bexp):
                problems.append(f"P{bp+1} back cell#{k}: '{bexp}' missing")
            # overlap check
            o = overlap_found(fspan)
            if o:
                problems.append(f"P{fp+1} front cell#{k}: overlap '{o[0]}' x '{o[1]}'")
            o = overlap_found(bspan)
            if o:
                problems.append(f"P{bp+1} back cell#{k}: overlap '{o[0]}' x '{o[1]}'")
            # DUPLEX pairing: front cell k glues to back cell kg under long-edge flip
            r, c = k // COLS, k % COLS
            kg = r * COLS + (COLS - 1 - c)
            if kg < n:
                fr_name = subset[k]['zh']
                bb = spans_in_cell(back, kg)
                if not zw_name_in(bb, fr_name):
                    problems.append(f"PAIR P{fp+1}/{bp+1}: front#{k}('{fr_name}') != back glued#{kg}('{subset[perm[kg]]['zh']}')")
            if mono:
                if is_colorful(fspan) or is_colorful(bspan):
                    colored_hits += 1
    doc.close()
    return problems, colored_hits


def check_geometry(path):
    """External proof that the PDF is duplex-print / cut safe:
       - every page has the SAME MediaBox (identical page height/width),
       - the card grid is centered (even top/bottom & left/right cut margins),
       so a front card and its glued back card sit at identical coordinates."""
    import fitz as _fitz
    doc = _fitz.open(path)
    boxes = []
    for pg in doc:
        b = pg.rect  # fitz.Rect: x0,y0,x1,y1
        boxes.append((round(b.width, 3), round(b.height, 3)))
    doc.close()
    w0, h0 = boxes[0]
    same_size = all(abs(w - w0) < 0.01 and abs(h - h0) < 0.01 for w, h in boxes)
    # grid centering from generator constants -> cut grid must be even
    grid_w = COLS * CW + (COLS - 1) * mk.GAP
    grid_h = ROWS * CH + (ROWS - 1) * mk.GAP
    centered = (abs(mk.MARGIN_X - (mk.PW - grid_w - mk.MARGIN_X)) < 1e-6 and
                abs(mk.MARGIN_Y - (mk.PH - grid_h - mk.MARGIN_Y)) < 1e-6)
    return {'pages': len(boxes), 'page_w': w0, 'page_h': h0,
            'all_pages_same_size': same_size, 'grid_centered': centered}


def main():
    color_path = sys.argv[1] if len(sys.argv) > 1 else 'psychopharm-cards-deck.pdf'
    mono_path = sys.argv[2] if len(sys.argv) > 2 else 'psychopharm-cards-deck-mono.pdf'
    print(f"== DUPLEX mode: {mk.DUPLEX} ==")

    geo_c = check_geometry(color_path)
    geo_m = check_geometry(mono_path)
    print("== GEOMETRY / DUPLEX REGISTRATION ==")
    for name, g in [('COLOR', geo_c), ('MONO', geo_m)]:
        print(f"  [{name}] pages={g['pages']} size={g['page_w']}x{g['page_h']}pt "
              f"same_size={g['all_pages_same_size']} grid_centered={g['grid_centered']}")
    geo_ok = (geo_c['all_pages_same_size'] and geo_m['all_pages_same_size']
              and geo_c['grid_centered'] and geo_m['grid_centered'])

    cp, cc = qa_file(color_path, mono=False)
    print(f"[COLOR] {color_path}: problems={len(cp)}")
    for p in cp:
        print("   -", p)
    mp, mc = qa_file(mono_path, mono=True)
    print(f"[MONO ] {mono_path}: problems={len(mp)}, colored-card-hits={mc}")
    for p in mp:
        print("   -", p)
    ok = (len(cp) == 0 and len(mp) == 0 and mc == 0 and geo_ok)
    print("RESULT:", "PASS ✅" if ok else "FAIL ❌")
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
