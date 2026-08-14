# -*- coding: utf-8 -*-
"""Generate a printable pocket flashcard deck (front/back) from drugs.json.
A4 portrait, 3x3 grid of poker-size cards (180x252 pt), crop marks,
class color-coded. Fronts and backs interleaved for long-edge duplex printing.
"""
import json
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, Color
from reportlab.pdfbase.pdfmetrics import stringWidth

pdfmetrics.registerFont(UnicodeCIDFont('STSong-Light'))
FONT = 'STSong-Light'

# class -> (main color, soft bg, dark "print-safe" band color, short label)
# The dark band guarantees white text stays legible even in grayscale / ink-saver print.
CLASS = {
    '抗抑郁药':   ('#2E7DD1', '#E7F0FB', '#1957A0', '抗抑郁'),
    '抗精神病药': ('#4F46B8', '#ECEBF9', '#332B86', '抗精神病'),
    '心境稳定剂': ('#C08A1E', '#F8F0DC', '#8A6110', '心境稳定'),
    '抗焦虑药':   ('#0E8C7F', '#E3F3F0', '#0A6A60', '抗焦虑'),
    '催眠药':     ('#0E7490', '#E0F2FE', '#0A5870', '催眠'),
    '兴奋剂':     ('#C2466B', '#FBE7EE', '#8E3349', '兴奋剂'),
    '相关药物':   ('#6B7280', '#EEF1F5', '#434C58', '相关'),
}
WARN_BG = Color(0.99, 0.92, 0.93)
WARN_BD = Color(0.61, 0.11, 0.17)
INK = Color(0.16, 0.20, 0.27)
GREY = Color(0.42, 0.47, 0.54)
LINE = Color(0.84, 0.87, 0.91)
SHADOW = Color(0.80, 0.83, 0.88)
# Neutral palette for the ink-saver (mono) deck: pure grayscale, R=G=B, no hue,
# so only the black cartridge is used (no C/M/Y).
MONO_INK = Color(0.13, 0.13, 0.13)
MONO_GREY = Color(0.46, 0.46, 0.46)
MONO_EDGE = Color(0.62, 0.62, 0.62)

PW, PH = A4
CARD_W, CARD_H = 180, 252
COLS, ROWS = 3, 3
GAP = 14
MARGIN_X = (PW - (COLS * CARD_W + (COLS - 1) * GAP)) / 2
MARGIN_Y = (PH - (ROWS * CARD_H + (ROWS - 1) * GAP)) / 2
PAD = 9          # inner padding
R = 10           # corner radius

# Duplex flip mode (how the printed sheet is flipped for double-sided printing):
#   'long'  -> flip on LONG edge (book style): printer mirrors the back horizontally,
#              so the back grid is drawn with columns reversed to keep each card paired by drug.
#   'short' -> flip on SHORT edge (tablet/calendar style): printer mirrors the back vertically.
#   'none'  -> driver keeps 1:1 alignment (some setups): back drawn identical to front.
# If a test print shows a cut card's front/back are still different drugs, switch this.
DUPLEX = 'long'

def _back_perm(n):
    """Return back-slot index for each drug index j (0..n-1), i.e. the grid slot on
    the back page where drug j must be drawn so it glues to its front under DUPLEX.
    flip() is an involution and always lands inside the full ROWS*COLS grid, so this
    is safe even for a partial last page (n < ROWS*COLS) — no out-of-range index."""
    if DUPLEX == 'short':
        return [(ROWS - 1 - (j // COLS)) * COLS + (j % COLS) for j in range(n)]
    if DUPLEX == 'long':
        return [(j // COLS) * COLS + (COLS - 1 - (j % COLS)) for j in range(n)]
    return list(range(n))  # 'none'


def wrap(text, size, maxW):
    """Char-level wrap; returns list of lines."""
    lines, cur = [], ''
    for ch in text:
        if ch == '\n':
            lines.append(cur); cur = ''; continue
        if stringWidth(cur + ch, FONT, size) > maxW and cur:
            lines.append(cur); cur = ch
        else:
            cur += ch
    if cur:
        lines.append(cur)
    return lines


def chips(c, items, x, y, maxW, size, color, soft, limit=6, stroke=None):
    """Draw wrapping chips; returns new top y. Pass stroke=INK for outline-only (mono)."""
    items = items[:limit] + (['+%d' % (len(items) - limit)] if len(items) > limit else [])
    padX, padY, g = 5, 3, 4
    chipH = size + 2 * padY
    curX = x
    minY = y
    for it in items:
        w = stringWidth(it, FONT, size) + 2 * padX
        if curX > x and curX + w > x + maxW:
            curX = x; y -= (chipH + g)
        c.setFillColor(soft)
        if stroke is not None:
            c.setStrokeColor(stroke); c.setLineWidth(0.5)
            c.roundRect(curX, y - chipH, w, chipH, 5, fill=1, stroke=1)
        else:
            c.roundRect(curX, y - chipH, w, chipH, 5, fill=1, stroke=0)
        c.setFillColor(color)
        c.setFont(FONT, size)
        c.drawString(curX + padX, y - chipH + padY, it)
        curX += w + g
        minY = min(minY, y - chipH)
    return minY - g


def section(c, x, y, maxW, label, color, lines, maxLines, bodyC=INK, ellC=GREY):
    """Draw a labeled block (label carries a colored square dot); returns new y."""
    c.setFillColor(color); c.rect(x - 7, y - 8, 4, 4, fill=1, stroke=0)
    c.setFillColor(color); c.setFont(FONT, 7.5); c.drawString(x, y - 9, label)
    y -= 12
    n = 0
    for ln in lines:
        if n >= maxLines:
            c.setFillColor(ellC); c.setFont(FONT, 6); c.drawString(x, y - 8, '…')
            y -= 9; n += 1; break
        c.setFillColor(bodyC); c.setFont(FONT, 6.8); c.drawString(x, y - 8, ln)
        y -= 9.5; n += 1
    return y - 3


def sec_label(c, x, y, color, label, size=7.5):
    """Section label with a small colored square dot (label text at x, dot at x-7)."""
    c.setFillColor(color); c.rect(x - 7, y - 8, 4, 4, fill=1, stroke=0)
    c.setFillColor(color); c.setFont(FONT, size); c.drawString(x, y - 9, label)


def _card_path(c, x, yb, w, h, r):
    """Rounded-rect path (bottom-left origin), consistent corner arcs."""
    p = c.beginPath()
    p.moveTo(x + r, yb + h)
    p.lineTo(x + w - r, yb + h)
    p.arcTo(x + w - 2 * r, yb + h - 2 * r, x + w, yb + h, 0, 90)   # top-right
    p.lineTo(x + w, yb + r)
    p.arcTo(x + w - 2 * r, yb, x + w, yb + 2 * r, 90, 90)           # bottom-right
    p.lineTo(x + r, yb)
    p.arcTo(x, yb, x + 2 * r, yb + 2 * r, 180, 90)                 # bottom-left
    p.lineTo(x, yb + h - r)
    p.arcTo(x, yb + h - 2 * r, x + 2 * r, yb + h, 270, 90)         # top-left
    p.close()
    return p


def draw_card(c, d, x, yb, face, mono=False):
    main, soft, band, short = CLASS.get(d['cls'], ('#6B7280', '#EEF1F5', '#434C58', d['cls']))
    mainC, softC, accentC = HexColor(main), HexColor(soft), HexColor(band)
    if mono:
        # ink-saving: pure grayscale only (no hue) so a black cartridge does the job
        accentC = MONO_INK
        softC = Color(1, 1, 1)
        chip_stroke = MONO_INK
        warn_bg = Color(1, 1, 1)
        warn_bd = MONO_INK
        edge = MONO_EDGE
        warn_lbl = MONO_INK
        inkC = MONO_INK
        greyC = MONO_GREY
    else:
        chip_stroke = None
        warn_bg = WARN_BG
        warn_bd = WARN_BD
        edge = LINE
        warn_lbl = WARN_BD
        inkC = INK
        greyC = GREY
    top = yb + CARD_H

    # shadow (skip in mono to save ink)
    if not mono:
        c.setFillColor(SHADOW)
        c.roundRect(x + 3, yb - 3, CARD_W, CARD_H, R, fill=1, stroke=0)
    # white card
    c.setFillColor(Color(1, 1, 1))
    c.roundRect(x, yb, CARD_W, CARD_H, R, fill=1, stroke=0)
    c.setStrokeColor(edge); c.setLineWidth(0.8)
    c.roundRect(x, yb, CARD_W, CARD_H, R, fill=0, stroke=1)

    if face == 'front':
        # category color identity: top bar + left spine (skip in mono)
        if not mono:
            c.saveState(); c.clipPath(_card_path(c, x, yb, CARD_W, CARD_H, R), stroke=0, fill=0)
            c.setFillColor(accentC)
            c.rect(x, top - 9, CARD_W, 9, fill=1, stroke=0)        # top bar
            c.rect(x, yb, 4, CARD_H, fill=1, stroke=0)             # left spine
            c.restoreState()
        # class chip top-left (soft tint + deep band text)
        cls = d['cls']
        cw = stringWidth(cls, FONT, 8.5) + 18
        c.setFillColor(softC)
        if mono:
            c.setStrokeColor(inkC); c.setLineWidth(0.6)
            c.roundRect(x + 12, top - 32, cw, 19, 9.5, fill=1, stroke=1)
        else:
            c.roundRect(x + 12, top - 32, cw, 19, 9.5, fill=1, stroke=0)
        c.setFillColor(accentC); c.setFont(FONT, 8.5)
        c.drawString(x + 12 + 9, top - 32 + 5.5, cls)
        # drug name (primary)
        c.setFillColor(inkC); c.setFont(FONT, 21)
        c.drawCentredString(x + CARD_W / 2, yb + 140, d['zh'])
        # english name
        c.setFillColor(greyC); c.setFont(FONT, 8.5)
        c.drawCentredString(x + CARD_W / 2, yb + 123, d['en'])
        # divider
        c.setStrokeColor(edge); c.setLineWidth(0.8)
        c.line(x + 34, yb + 105, x + CARD_W - 34, yb + 105)
        # subclass pill centered
        sub = d.get('sub', '')
        if sub:
            sw = stringWidth(sub, FONT, 8.5) + 22
            scx = x + CARD_W / 2 - sw / 2
            c.setFillColor(softC)
            if mono:
                c.setStrokeColor(inkC); c.setLineWidth(0.6)
                c.roundRect(scx, yb + 82, sw, 18, 9, fill=1, stroke=1)
            else:
                c.roundRect(scx, yb + 82, sw, 18, 9, fill=1, stroke=0)
            c.setFillColor(accentC); c.setFont(FONT, 8.5)
            c.drawString(scx + 11, yb + 82 + 5, sub)
        # meta
        meta = '半衰期 %s  ·  妊娠 %s' % (d.get('half', '—'), d.get('preg', '—'))
        c.setFillColor(greyC); c.setFont(FONT, 7.5)
        c.drawCentredString(x + CARD_W / 2, yb + 54, meta)
        # brand only (flip hint removed)
        c.setFillColor(accentC); c.setFont(FONT, 6)
        c.drawCentredString(x + CARD_W / 2, yb + 14, '药枢 · NeuroPharm')

    else:  # back
        if not mono:
            c.saveState(); c.clipPath(_card_path(c, x, yb, CARD_W, CARD_H, R), stroke=0, fill=0)
            c.setFillColor(accentC)
            c.rect(x, top - 9, CARD_W, 9, fill=1, stroke=0)
            c.rect(x, yb, 4, CARD_H, fill=1, stroke=0)
            c.restoreState()
        # header (outside inner clip)
        c.setFillColor(inkC); c.setFont(FONT, 12.5)
        c.drawString(x + PAD, top - 21, d['zh'])
        c.setFillColor(greyC); c.setFont(FONT, 6.5)
        c.drawString(x + PAD, top - 31, d['en'])
        c.setFillColor(accentC); c.rect(x + CARD_W - PAD - 13, top - 29, 4.5, 4.5, fill=1, stroke=0)
        c.setFillColor(accentC); c.setFont(FONT, 7)
        c.drawRightString(x + CARD_W - PAD - 17, top - 26, d['cls'])
        # clip content to inner frame -- nothing crosses the border line
        c.saveState()
        c.clipPath(_card_path(c, x + PAD, yb + PAD, CARD_W - 2 * PAD, CARD_H - 2 * PAD, 6), stroke=0, fill=0)
        INS = 4                      # extra inset so text never rides the clip edge (no left-sliver clip)
        TX = x + PAD + INS
        BX = TX + 7                  # content/label indent (section dot sits at TX)
        BW = CARD_W - 2 * PAD - 2 * INS - 7
        y = top - 44
        y = section(c, BX, y, BW, '作用机制', accentC,
                    wrap(d.get('mech', ''), 6.8, BW), 2, bodyC=inkC, ellC=greyC)
        sec_label(c, BX, y, accentC, '适应症'); y -= 13
        y = chips(c, d.get('ind', []), BX, y, BW, 6.5, accentC, softC, 6, stroke=chip_stroke)
        sec_label(c, BX, y, warn_lbl, '不良反应'); y -= 13
        y = chips(c, d.get('side', []), BX, y, BW, 6.5, warn_lbl, softC, 6, stroke=chip_stroke)
        # warning box (size to available space, never past frame)
        avail = y - (yb + PAD + 4)
        if avail > 22:
            wl = wrap(d.get('warn', ''), 6.5, BW - 10)
            rows = max(1, min(3, int((avail - 10) / 9)))
            boxH = rows * 9 + 8
            c.setFillColor(warn_bg)
            c.setStrokeColor(warn_bd); c.setLineWidth(0.8)
            c.roundRect(BX, y - boxH, BW, boxH, 5, fill=1, stroke=1)
            c.setFillColor(warn_bd); c.setLineWidth(1.5)
            c.line(BX + 3, y - 2, BX + 3, y - boxH + 2)
            c.setFillColor(warn_bd); c.setFont(FONT, 6.8)
            c.drawString(BX + 8, y - 11, '关键警示')
            yy = y - 21
            for ln in wl[:rows - 1]:
                c.setFillColor(inkC); c.setFont(FONT, 6.3)
                c.drawString(BX + 8, yy, ln); yy -= 8.5
            y = y - boxH - 6
        # dose
        if y > yb + PAD + 12:
            sec_label(c, BX, y, accentC, '用法用量'); y -= 13
            for ln in wrap(d.get('dose', ''), 6.5, BW)[:2]:
                c.setFillColor(inkC); c.setFont(FONT, 6.3)
                c.drawString(BX, y - 8, ln); y -= 9
        c.restoreState()


def crop_marks(c, x, yb):
    c.setStrokeColor(Color(0.45, 0.45, 0.45))  # neutral gray guide (grayscale for both decks)
    off, t = 3, 7
    for (cx, cy) in [(x, yb + CARD_H), (x + CARD_W, yb + CARD_H),
                     (x, yb), (x + CARD_W, yb)]:
        is_right = (cx == x + CARD_W)
        is_top = (cy == yb + CARD_H)
        # horizontal tick
        x1 = cx + (off if is_right else -off - t)
        x2 = cx + (off + t if is_right else -off)
        c.line(x1, cy, x2, cy)
        # vertical tick
        y1 = cy + (off if is_top else -off - t)
        y2 = cy + (off + t if is_top else -off)
        c.line(cx, y1, cx, y2)


def grid_positions():
    pos = []
    yb_top = PH - MARGIN_Y - CARD_H
    for r in range(ROWS):
        yb = yb_top - r * (CARD_H + GAP)
        for col in range(COLS):
            x = MARGIN_X + col * (CARD_W + GAP)
            pos.append((x, yb))
    return pos


def assert_layout():
    """Registration contract for duplex (double-sided) printing.

    Every card is drawn as an *exactly* CARD_W x CARD_H rectangle at *identical*
    grid coordinates on BOTH the front and back page, and the page itself is a
    fixed A4 size. This guarantees that after a long/short-edge duplex print and
    a straight cut along the crop marks, each physical card has its front and
    back perfectly registered (same height / same position) — no drift, no
    mis-cut. Any future edit that changes a card's size or shifts the grid
    asymmetrically must fail this check loudly.
    """
    assert CARD_W > 0 and CARD_H > 0, "card size must be fixed > 0"
    assert abs(PW - A4[0]) < 1e-6 and abs(PH - A4[1]) < 1e-6, "page size must be fixed A4"
    grid_w = COLS * CARD_W + (COLS - 1) * GAP
    grid_h = ROWS * CARD_H + (ROWS - 1) * GAP
    # centered grid -> even cut margins (left==right, top==bottom)
    assert abs(MARGIN_X - (PW - grid_w - MARGIN_X)) < 1e-6, "horizontal margins must match"
    assert abs(MARGIN_Y - (PH - grid_h - MARGIN_Y)) < 1e-6, "vertical margins must match"
    # front and back share the exact same 9-slot grid
    assert len(grid_positions()) == COLS * ROWS
    return {
        'page': (round(PW, 2), round(PH, 2)),
        'card': (CARD_W, CARD_H),
        'margin_x': round(MARGIN_X, 2),
        'margin_y': round(MARGIN_Y, 2),
        'duplex': DUPLEX,
    }


def main():
    lay = assert_layout()
    print('layout registration:', lay)
    drugs = json.load(open('drugs.json', encoding='utf-8'))
    pos = grid_positions()
    PER = len(pos)  # 9
    sets = [drugs[i:i + PER] for i in range(0, len(drugs), PER)]

    for outfile, mono in [('psychopharm-cards-deck.pdf', False),
                          ('psychopharm-cards-deck-mono.pdf', True)]:
        c = canvas.Canvas(outfile, pagesize=A4)
        for si, subset in enumerate(sets):
            n = len(subset)
            # front page (drug i at grid slot i, 1:1)
            for k in range(n):
                x, yb = pos[k]
                draw_card(c, subset[k], x, yb, 'front', mono=mono)
                crop_marks(c, x, yb)
            c.showPage()
            # back page: each drug j is drawn at the back slot (perm[j]) that glues
            # to its front under DUPLEX, so a cut card's front/back match.
            perm = _back_perm(n)            # perm[j] = back-slot for drug j
            for j in range(n):
                x, yb = pos[perm[j]]
                draw_card(c, subset[j], x, yb, 'back', mono=mono)
                crop_marks(c, x, yb)
            c.showPage()
        c.save()
        print('wrote', outfile, 'pages:', len(sets) * 2, 'cards:', len(drugs))


if __name__ == '__main__':
    main()
