#!/usr/bin/env python3
"""
Create DodoPayments products via API.
Tries multiple base URLs since api.dodopayments.com may not resolve.
Usage: python3 create_dodo_products.py <API_KEY> [test|live]
"""

import json
import urllib.request
import urllib.error
import sys

API_KEY = sys.argv[1] if len(sys.argv) > 1 else ""
ENV = sys.argv[2] if len(sys.argv) > 2 else "test"

if not API_KEY:
    print("Usage: python3 create_dodo_products.py <DODOPAYMENTS_API_KEY> [test|live]")
    sys.exit(1)

if ENV == "live":
    BASE_URLS = [
        "https://live.dodopayments.com",
    ]
else:
    BASE_URLS = [
        "https://test.dodopayments.com",
    ]

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

products = [
    {
        "name": "Pro Contributor Monthly",
        "price": 900,
        "interval": "month",
        "type": "recurring"
    },
    {
        "name": "Pro Contributor Yearly",
        "price": 7900,
        "interval": "year",
        "type": "recurring"
    },
    {
        "name": "Preflight Pack 10",
        "price": 500,
        "interval": None,
        "type": "one_time"
    },
    {
        "name": "Repo Deep Audit",
        "price": 1900,
        "interval": None,
        "type": "one_time"
    },
    {
        "name": "GFI Bounty Boost 7d",
        "price": 900,
        "interval": None,
        "type": "one_time"
    },
    {
        "name": "Recruiter Pass Monthly",
        "price": 4900,
        "interval": "month",
        "type": "recurring"
    },
    {
        "name": "Recruiter Pass Yearly",
        "price": 39000,
        "interval": "year",
        "type": "recurring"
    },
    {
        "name": "Maintainer SLA Monthly",
        "price": 2900,
        "interval": "month",
        "type": "recurring"
    },
]

def try_request(url, body):
    req = urllib.request.Request(
        url,
        data=body,
        headers=headers,
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        raise Exception(f"HTTP {e.code}: {err_body}")
    except urllib.error.URLError as e:
        raise Exception(f"URL error: {e.reason}")

results = []

for p in products:
    if p["type"] == "recurring":
        interval_str = "Month" if p["interval"] == "month" else "Year"
        price_obj = {
            "type": "recurring_price",
            "currency": "USD",
            "discount": 0,
            "price": p["price"],
            "payment_frequency_interval": interval_str,
            "payment_frequency_count": 1,
            "subscription_period_interval": interval_str,
            "subscription_period_count": 1,
            "purchasing_power_parity": False
        }
    else:
        price_obj = {
            "type": "one_time_price",
            "currency": "USD",
            "discount": 0,
            "price": p["price"],
            "purchasing_power_parity": False
        }

    body = json.dumps({
        "name": p["name"],
        "price": price_obj,
        "tax_category": "digital_products"
    }).encode()

    created = False
    for base in BASE_URLS:
        url = f"{base}/products"
        try:
            data = try_request(url, body)
            pid = data.get("product_id", "unknown")
            results.append({"name": p["name"], "id": pid, "status": "created", "url": base})
            print(f"✓ {p['name']}: {pid} ({base})")
            created = True
            break
        except Exception as e:
            print(f"  ✗ {base}: {e}")

    if not created:
        results.append({"name": p["name"], "id": None, "status": "failed"})
        print(f"✗ {p['name']}: all endpoints failed")

print("\n=== Summary ===")
for r in results:
    status = r['status']
    if r.get('id'):
        status += f" -> {r['id']}"
    print(f"{r['name']}: {status}")
