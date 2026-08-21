# ${{ values.name }}

Owner: ${{ values.owner }}  
Last reviewed: 2026-08-20  
Audience: INTERNAL ENGINEERING  
Version: ${{ values.version }}

Reusable **platform component** for a governed MQTT event namespace.
This is not a Data Product.

Root namespace: `${{ values.rootNamespace }}`

```bash
docker compose up --build
```

Then publish demonstration events:

```bash
pip install -e ".[dev]"
python examples/publish_examples.py
```

See platform Developer Hub: Unified Namespace Overview.
