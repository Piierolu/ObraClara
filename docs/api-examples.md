# Ejemplos de API

```bash
curl -H "Authorization: Bearer demo-admin" \
  http://localhost:8080/api/projects
```

```bash
curl -H "Authorization: Bearer demo-admin" \
  -F "file=@fixtures/documents/03-factura-fac-1042.txt;type=text/plain" \
  http://localhost:8080/api/projects/00000000-0000-0000-0000-000000000010/documents
```

```bash
curl -H "Authorization: Bearer demo-admin" \
  -H "Content-Type: application/json" \
  -d '{"question":"Cual es la retencion facturada?"}' \
  http://localhost:8080/api/projects/00000000-0000-0000-0000-000000000010/questions
```

```bash
curl -H "Authorization: Bearer demo-reviewer" \
  -H "Content-Type: application/json" \
  -d '{"decision":"CONFIRMED","comment":"Confirmado contra contrato y factura"}' \
  http://localhost:8080/api/anomalies/ANOMALY_ID/review
```
