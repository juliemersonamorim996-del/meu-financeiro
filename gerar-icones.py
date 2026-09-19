"""Gera os ícones do app (tela de início do celular) a partir do logo.

Rode de novo só se mudar o logo:  python gerar-icones.py
"""
from PIL import Image, ImageDraw
from pathlib import Path

base = Path(__file__).parent / "docs"
base.mkdir(exist_ok=True)

FUNDO = (10, 11, 14)
VERDE_1 = (95, 246, 201)   # pílula grande
VERDE_2 = (16, 176, 127)
VERDE_3 = (43, 227, 170)   # pílula pequena
VERDE_4 = (11, 127, 93)


def degrade(draw_size, cor_topo, cor_base):
    faixa = Image.new("RGB", (1, draw_size))
    for y in range(draw_size):
        k = y / max(1, draw_size - 1)
        faixa.putpixel((0, y), tuple(round(a + (b - a) * k) for a, b in zip(cor_topo, cor_base)))
    return faixa.resize((draw_size, draw_size))


def icone(tamanho, margem=0.16, fundo=True):
    ss = 4  # desenha grande e reduz, para as bordas ficarem lisas
    s = tamanho * ss
    img = Image.new("RGBA", (s, s), FUNDO + (255,) if fundo else (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if fundo:
        r = int(s * 0.22)
        fundo_img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        ImageDraw.Draw(fundo_img).rounded_rectangle([0, 0, s - 1, s - 1], radius=r, fill=FUNDO + (255,))
        img = fundo_img
        d = ImageDraw.Draw(img)

    # duas pílulas do logo, proporções iguais às do SVG (36x36)
    m = s * margem
    esc = (s - 2 * m) / 36
    def pilula(x, y, w, h, cor_topo, cor_base):
        cx0, cy0 = m + x * esc, m + y * esc
        cx1, cy1 = cx0 + w * esc, cy0 + h * esc
        mask = Image.new("L", (s, s), 0)
        ImageDraw.Draw(mask).rounded_rectangle([cx0, cy0, cx1, cy1], radius=(w * esc) / 2, fill=255)
        img.paste(degrade(s, cor_topo, cor_base), (0, 0), mask)

    pilula(4, 12, 12, 21, VERDE_3, VERDE_4)
    pilula(15, 3, 13, 23, VERDE_1, VERDE_2)
    return img.resize((tamanho, tamanho), Image.LANCZOS)


icone(192).save(base / "icone-192.png")
icone(512).save(base / "icone-512.png")
icone(180, margem=0.20).save(base / "icone-apple-180.png")
icone(512, margem=0.28).save(base / "icone-maskable-512.png")  # com área de respiro para o Android recortar
print("ícones gerados em docs/")
