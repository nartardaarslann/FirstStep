import io
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

font_path = Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
if font_path.exists():
    pdfmetrics.registerFont(TTFont('Ritim', str(font_path)))


def build_report(user, meals, logs):
    output = io.BytesIO()
    font = 'Ritim' if font_path.exists() else 'Helvetica'
    styles = getSampleStyleSheet()
    for style in styles.byName.values():
        style.fontName = font
    doc = SimpleDocTemplate(output, pagesize=A4, rightMargin=36, leftMargin=36)
    body = [Paragraph('RİTİM · Klinik Görüşme Raporu', styles['Title']), Spacer(1, 16),
            Paragraph(f"{escape(user['name'])} · Son 30 gün", styles['Heading2']),
            Paragraph('Bu rapor kullanıcı kayıtlarını özetler. Tanı veya tedavi amacı taşımaz. Fotoğraf analizleri ve besin değerleri bu prototipte simüle edilmiştir; USDA canlı verisi değildir. FNI ve denge formülü klinik olarak doğrulanmamış bir prototip sezgisidir.', styles['BodyText']), Spacer(1, 20)]
    body.append(Paragraph('Günlük uyku, su ve dinlenme', styles['Heading2']))
    rows = [['Tarih', 'Uyku (sa)', 'Su (bardak)', 'Dinlenme', 'Puan']]
    rows += [[r['date'], str(r.get('sleep') if r.get('sleep') is not None else '—'), str(r.get('water', 0)), 'Evet' if r.get('recovery_mode') else 'Hayır', str(r.get('overall_score') if r.get('overall_score') is not None else '—')] for r in logs]
    table = Table(rows, repeatRows=1, hAlign='LEFT')
    table.setStyle(TableStyle([('FONTNAME', (0, 0), (-1, -1), font), ('FONTSIZE', (0, 0), (-1, -1), 9), ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E3EFE5')), ('BOTTOMPADDING', (0, 0), (-1, -1), 9)]))
    body += [table, Spacer(1, 20), Paragraph('Öğünler ve doğallık', styles['Heading2'])]
    tags = {'home': 'Ev yapımı', 'restaurant': 'Restoran', 'packaged': 'Paketli'}
    for meal in meals:
        m = meal['macros']
        body.append(Paragraph(f"{meal['date']} · {escape(meal['name'])} · {tags[meal['tag']]}<br/>FNI {meal['fni']} · Makro denge {meal['macro_balance']} · Sonuç {meal['score']}/100<br/>Protein {m['protein']}g / Karbonhidrat {m['carbs']}g / Yağ {m['fat']}g / Lif {m['fiber']}g / Şeker {m['sugar']}g", styles['BodyText']))
        body.append(Spacer(1, 10))
    body += [Spacer(1, 10), Paragraph('Mikro günlük', styles['Heading2'])]
    for log in logs:
        if log.get('journal_entry'):
            body.append(Paragraph(f"{log['date']}: {escape(log['journal_entry'])}", styles['BodyText']))
    body.append(Spacer(1, 16))
    body.append(Paragraph('Öğün skoru = %60 FNI + %40 makro denge. FNI: ev yapımı 95, restoran 65, paketli 30. Günlük puan: beslenme %60, uyku %25, su %15; yalnızca girilmiş veriler üzerinden ağırlıklar yeniden ölçeklenir. Kaynak etiketi tek başına bir gıdanın sağlık etkisini göstermez.', styles['BodyText']))
    doc.build(body)
    return output.getvalue()