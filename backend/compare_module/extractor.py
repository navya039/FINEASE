import re

def extract_interest(text):
    match = re.search(r'interest rate[:\s]*([\d.]+)%', text, re.I)
    return float(match.group(1)) if match else None

def extract_lockin(text):
    match = re.search(r'lock[- ]?in period[:\s]*([\d]+)', text, re.I)
    return int(match.group(1)) if match else None
