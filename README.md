# Engelhard Routeplanner

Präsentationsfähiger React/TypeScript/Vite-POC für die Planung von Apothekenbesuchen im Außendienst.

## Start

```bash
npm install
npm run dev
```

Weitere Kommandos: `npm run build`, `npm test`, `npm run test:e2e`.

## Enthalten

- Mobile-first Shell mit Desktop-Seitenleiste und mobiler Bottom-Navigation
- Heute, Verkaufsrunde, Wochenplanung, Apotheken-Stammdaten und Einstellungen
- 25 synthetische Demo-Apotheken ohne echte Personen- oder Kundendaten
- priorisierte Demo-Besuche, simulierte Karte und Mock-Routing-Service
- Warnlogik bei Verschiebungen zwischen Wochen
- Heimfahrt-vs.-Übernachtung mit Kosten- und Zeitvergleich
- konfigurierbare Arbeits- und Übernachtungsparameter
- PWA Manifest und Offline-Fallback-Grundlage

## Bekannte POC-Grenzen

- Routing, Karten, Hotels und Navigation sind bewusst simuliert.
- Die Demo-Daten werden aktuell aus `src/data/demo.ts` geladen; lokale Persistenz und Planversionen sind als nächste Ausbaustufe vorgesehen.
- Drag-and-drop, vollständige Optimierung und produktive Veeva-Anbindung sind noch nicht enthalten.
- Der Playwright-Smoke-Test ist angelegt. In der Entwicklungsumgebung konnte der benötigte Chromium-Browser wegen des eingeschränkten Download-Endpunkts nicht installiert werden; lokal funktioniert er nach `npx playwright install chromium`.

## Struktur

- `src/services/routing.ts`: Routing-Interface und deterministischer Mock
- `src/services/planner.ts`: Auswirkungen und Planungskennzahlen
- `src/config/branding.ts`: zentrale Branding-Konfiguration
- `public/branding/engelhard-logo.svg`: neutraler austauschbarer Platzhalter
