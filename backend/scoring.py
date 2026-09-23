from models import Macros

SAMPLES = {
    'bowl': {'name': 'Renkli denge kasesi', 'items': ['Nohut', 'Avokado', 'Taze sebzeler', 'Bulgur'],
             'macros': {'protein': 18, 'carbs': 52, 'fat': 19, 'fiber': 12, 'sugar': 7},
             'micronutrients': {'iron': 4.2, 'calcium': 110, 'magnesium': 120, 'vitamin_c': 45}},
    'oats': {'name': 'Meyveli yulaf kasesi', 'items': ['Yulaf', 'Yoğurt', 'Muz', 'Ceviz'],
             'macros': {'protein': 16, 'carbs': 48, 'fat': 14, 'fiber': 8, 'sugar': 14},
             'micronutrients': {'iron': 3.1, 'calcium': 220, 'magnesium': 95, 'vitamin_c': 12}},
    'snack': {'name': 'Çikolatalı atıştırmalık', 'items': ['Sütlü çikolata', 'Bisküvi'],
              'macros': {'protein': 4, 'carbs': 52, 'fat': 18, 'fiber': 2, 'sugar': 35},
              'micronutrients': {'iron': 1.2, 'calcium': 80, 'magnesium': 30, 'vitamin_c': 0}}
}


def score_meal(tag, macros):
    m = Macros(**macros)
    energy = m.protein * 4 + m.carbs * 4 + m.fat * 9
    if energy == 0:
        balance = 0
    else:
        # Transparent heuristic, not a validated clinical score.
        p, c, f = m.protein * 4 / energy, m.carbs * 4 / energy, m.fat * 9 / energy
        distribution = max(0, 100 - (abs(p - .2) + abs(c - .5) + abs(f - .3)) * 100)
        fiber = min(100, m.fiber / 10 * 100)
        sugar = max(0, 100 - max(0, m.sugar - 10) * 3)
        balance = round(distribution * .5 + fiber * .3 + sugar * .2)
    fni = {'home': 95, 'restaurant': 65, 'packaged': 30}[tag]
    return {'fni': fni, 'macro_balance': balance, 'score': round(fni * .6 + balance * .4)}


def overall(meals, log):
    parts = []
    if meals:
        parts.append((sum(m['score'] for m in meals) / len(meals), .6))
    if log.get('sleep') is not None:
        parts.append((min(log['sleep'] / 8, 1) * 100, .25))
    if log.get('water', 0) > 0:
        parts.append((min(log['water'] / 8, 1) * 100, .15))
    return round(sum(v * w for v, w in parts) / sum(w for _, w in parts)) if parts else None


def insight(meals, log, hour):
    # Compare morning vs afternoon sugar per meal, not a cumulative sum.
    morning = [m['macros']['sugar'] for m in meals if m.get('local_hour', 0) < 15]
    afternoon = [m['macros']['sugar'] for m in meals if m.get('local_hour', 0) >= 15]
    disclaimer = 'Bu, bilgilendirici bir korelasyondur; tıbbi tavsiye değildir.'
    if log.get('sleep') is not None and log['sleep'] < 6 and hour >= 15 and morning and afternoon and sum(afternoon) / len(afternoon) > sum(morning) / len(morning):
        return {'triggered': True, 'title': 'Uykun ve iştahın birbiriyle konuşuyor',
                'message': 'Kısa uyuduğun bu günde, 15.00 sonrası öğün başına şeker miktarın arttı. Az uyku tatlı isteğiyle ilişkili olabilir. Kendine nazik davran.', 'disclaimer': disclaimer}
    return {'triggered': False, 'title': 'Bedeninin ritmini keşfediyoruz',
            'message': 'Uyku ve öğünlerini kaydettikçe olası ilişkileri burada görebilirsin. Henüz yeterli bir örüntü yok.', 'disclaimer': disclaimer}