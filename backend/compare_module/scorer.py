def score(data, user_prefs):
    score = 0
    if data.get('interest') and data['interest'] >= user_prefs.get('min_interest', 0):
        score += 1
    if data.get('lockin') and data['lockin'] <= user_prefs.get('max_lockin', 100):
        score += 1
    return score
