"""Junta src/ num único HTML: por-dentro-do-pote.html.

Uso: python3 plano-suplementos/visual/ferramentas/montar.py
"""
import json
import pathlib

BASE = pathlib.Path(__file__).resolve().parent.parent
SRC = BASE / "src"
ORDEM = ["util.js", "conteudo.js", "pid.js", "bancada.js",
         "cenas-whey.js", "cenas-creatina.js", "cenas-pre.js", "palco3d.js", "app.js"]


def main():
    html = (SRC / "index.html").read_text(encoding="utf-8")
    css = (SRC / "style.css").read_text(encoding="utf-8")
    dados = json.loads((SRC / "reacoes.json").read_text(encoding="utf-8"))
    js = ["const REACT = " + json.dumps(dados, separators=(",", ":")) + ";"]
    for nome in ORDEM:
        js.append(f"/* ===== {nome} ===== */\n" + (SRC / nome).read_text(encoding="utf-8"))
    script = "\n".join(js)
    if "</script" in script.lower():
        raise SystemExit("um arquivo JS contém '</script', o que quebraria o HTML")
    html = html.replace("/*@@STYLE@@*/", css).replace("/*@@SCRIPT@@*/", script)
    out = BASE / "por-dentro-do-pote.html"
    out.write_text(html, encoding="utf-8")
    print(f"{out} ({out.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
