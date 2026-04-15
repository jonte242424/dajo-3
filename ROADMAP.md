# DAJO 3.0 — Roadmap v2 (efter Jontes feedback + video-analys)

*Uppdaterad 2026-04-15 efter att ha sett IMG_0223.MOV (nuvarande spelläge) och fått tydlig prioritering.*

---

## Nya utgångspunkter (efter din feedback)

1. **Songbook är hjärtat** — inte iReal grid. Det är formatet du själv använder.
2. **PDF är spelläget** — inte rullande ackord. Stabilt, förutsägbart, ingen "daw light".
3. **Layout = användarens kontroll.** Olika låt, olika layout. DAJO ska hjälpa, inte tvinga.
4. **Annotering på PDF i spelläge** är must-have. Digital röd penna, highlighter, post-it på takt 17.
5. **Setlist = försättsblad + låtar i ordning, som en PDF.** Dela via länk eller maila till kapellmästaren.
6. **Community/bandspaces.** Kapellmästaren samlar bandet: "alla har låten i rätt tonart, rätt arr, rätt datum".
7. **Kärnuppdraget:** *import eller from scratch → editor → export → setlist/gigläge.* Leadsheet och kompskiss. Inte tusen funktioner.

---

## Vad jag såg i videon (din nuvarande app — forScore eller liknande)

**Styrkor som DAJO måste matcha eller slå:**
- PDF-baserat spelläge (frame 10, 20, 30) — stabil sidbild
- **Multi-color annotering direkt på PDF:** pink, gul, grön highlight, blå handskriven text ("Pedal") — frame 20
- **Färgade sektions-ankare** i kanten (röd "5", blå "A", röd "8") — frame 30. Tap-to-jump.
- **Dark mode textvy i 3 kolumner** med ackord inline (frame 34 — "Yellow"). Scen i mörker.
- Setlist/playlist-hantering (frame 25)
- Låtar med datum/version i listan

**Svagheter jag tror DAJO kan slå:**
- Varje låt är en statisk PDF → ingen transposering, ingen editing, inget samarbete
- Svårt att skapa från scratch — du måste göra PDF:en någon annanstans först
- Ingen delning med bandet i realtid
- Ingen import av audio → ackord
- Textlayout måste byggas manuellt

**DAJO:s edge:** *levande källa* (redigerbara data) som *exporteras till stabil PDF*. Bäst av båda världar.

---

## Re-prioriterad roadmap

### 🌊 VÅG 1: Grunden för din egen dagliga användning (1–2 veckor)

Efter det här vågen kan du lägga ned forScore för dina egna låtar.

| # | Feature | Dagar | Varför |
|---|---------|-------|-------|
| 1 | **Layout-kontroll i editor** — per låt välja sidformat, radmarginaler, font-storlek, om ackord är inline eller ovanför text | 2 | Du sa det rakt ut: "mest nytta av att kunna bestämma layout". Default-mallar (tight songbook, airy leadsheet, gig-kompakt), men användaren kan tweaka. |
| 2 | **Dark mode för både editor och spelläge** | 0.5 | Scen är mörk. Redan rätt i frame 34. |
| 3 | **PDF-annotering i spelläge** — fri penna (svart/röd/blå), highlighter (gul/grön/pink), sudda, undo | 3 | Detta är den enskilt största "jag lämnar forScore"-triggern. Använd Canvas på top-layer över PDF eller render in-process. Bibliotek: Fabric.js eller pdf-lib + canvas overlay. **Annoteringar sparas per låt i databasen** så de följer med när du öppnar igen. |
| 4 | **Sektions-ankare i spelläge** — färgade prickar i sidkanten för Vers/Refräng/Brygga. Tap = hoppa dit. | 1 | Frame 30 i din video. Data finns redan (sections har names). Bara rendering + scroll-to. |
| 5 | **Setlist-PDF med försättsblad + ordnade låtar** | 1.5 | Cover page: setlist-namn, datum, låtar numrerade med tonart + tempo. Sedan varje låt i ordning. Page numbering. Redan nära — `generateSetlistPdf` finns, behöver bara cover + TOC. |
| 6 | **Transpose-knapp direkt i spelläget** (+½, -½, +1, -1) | 0.5 | Kapellmästaren ropar "vi kör det en halvton upp". Klick, inte omladda. Back-end finns. |
| 7 | **Kompakt textvy (3-kolumn dark)** som alternativt spelläge för text-tunga låtar | 1.5 | Frame 34. Auto-layout som balanserar kolumner. |
| 8 | **Städa 24 pre-existing TS-fel** | 1 | Innan vi bygger på mer. |

**Total våg 1: ~10 dagar.** Efter detta: *du* är nöjd. Det är piloten.

---

### 🌊 VÅG 2: Bandet kommer med (2–3 veckor)

Det här är kapellmästar-grejen. När våg 1 är klar och du spelat 1–2 gig med DAJO själv.

| # | Feature | Dagar | Varför |
|---|---------|-------|-------|
| 9 | **Band Spaces** — skapa "plats" (t.ex. "Bandet Jonas kvartett"), bjud in via länk/email | 3 | Schema finns i databasen (groups). UI saknas. Invite-flöde via JWT-signed link (ingen email-server krävs — bara länk med token). |
| 10 | **Delade setlists per band** — alla ser samma, kapellmästaren redigerar | 1 | Bygger på #9. `setlists.group_id` kolumn. |
| 11 | **Delade låtar med per-medlem tonart-override** | 2 | Kritiskt: sångaren vill ha låten i C, pianisten i C, men saxofonisten vill se Bb. "Min vy" = transpose på klient-sidan, original oförändrat. |
| 12 | **"Kapellmästarens anteckningar" per låt per setlist** | 1 | Utöver privata annoteringar: delade noter som alla ser. "Håll tempot lugnt här", "Jonte startar". Visas som färgade ikoner på rätt takt/sektion. |
| 13 | **Setlist-versionshistorik** ("gig 2026-05-12" vs "gig 2026-06-03") | 1 | Återanvänd setlist, kopiera till nytt datum, ändra ordning. |
| 14 | **Export: skicka setlist som en nedladdbar PDF-länk via mail** | 1 | Kapellmästaren mailar gig-setlisten söndagen innan. Länk med 7-dagars giltighet räcker. |
| 15 | **iReal Pro XML-export** | 1 | För bandmedlemmar som redan kör iReal. Bygger bro. |
| 16 | **Kommentarer per takt (trådade)** | 1.5 | "Saxofonist: tar jag solot här?" "Jonte: ja, 8 takter". Löses i UI som nummer på takten → drawer. |
| 17 | **Mappar/taggar för låtar** | 1 | "Jazz", "Bröllop", "Bandet Jonas". Utan detta blir 50+ låtar kaos. |

**Total våg 2: ~12 dagar.** Efter detta är DAJO "kapellmästarens verktyg".

---

### 🌊 VÅG 3: Kompskiss-editorn blir bäst i klassen (2–3 veckor)

Detta är där DAJO blir "bäst på leadsheet + kompskiss". Inte DAW light — *kompakt power för arrangören*.

| # | Feature | Dagar | Varför |
|---|---------|-------|-------|
| 18 | **Copy-paste av takter** — markera 4 takter, Cmd+C, klistra in | 1 | Arrangering blir 10× snabbare. |
| 19 | **Chord voicings-diagram** (gitarr + piano) på klick | 2 | "Vad är F#m7b5?" → grepp visas. Bibliotek: svguitar, piano-chart. Visas på långklick i spelläge, inline i editor. |
| 20 | **Roman numeral-analys + funktionsfärg** (Tonal.js finns redan) | 1.5 | Hover över Gmaj7 i C-dur → "V⁷". Toggle-knapp: färglägg tonic/dominant/subdominant. Jazz-pedagogiskt guld. |
| 21 | **Enharmonisk smart stavning** | 1 | Am7 → F#m7b5 är fel i A-dur. Tonal.js fixar det om den vet tonarten. |
| 22 | **Form-erkänning vid import** | 2 | "AABA detekterad · A=8 takter · B=8 takter (bridge)". Kör som efteranalys på importerat material med Claude. |
| 23 | **Bättre audio-import UX** — progress, "detaljer"-expandering, "osäkra"-takter gulmarkerade | 1.5 | Din punkt 9 från gamla roadmapen. Göm Demucs/Whisper-jargongen. |
| 24 | **Syllable-level lyrics-alignment** (via word_timestamps + linear interpolation) | 2 | Word-level finns — gå djupare så varje stavelse sitter på rätt ton. Inget annat verktyg gör detta. |
| 25 | **Snap till diatoniska ackord** + varna vid icke-diatoniskt | 0.5 | Skriver "G#m" i C-dur → "Detta är inte diatoniskt. Menade du Gm eller Am?". |
| 26 | **Tangentbordsgenvägar i editor** (Cmd+T transpose, J/K nav, Space play, C kopiera takt) | 1 | Proffsanvändare vill inte klicka. |

**Total våg 3: ~13 dagar.**

---

### 🌊 VÅG 4: Polering + tillväxt (när 1–3 är validerade)

| # | Feature | Dagar | Varför |
|---|---------|-------|-------|
| 27 | **Native iPad-app (React Native eller Capacitor)** | vecka+ | Apple Pencil-stöd för annotering blir premium på iPad. Web kan inte matcha. |
| 28 | **Apple Pencil + palm rejection** i spelläge | 3 | Förutsätter native. Helt annan kvalitet på annotering. |
| 29 | **MIDI pedal för sidbyte** (Web MIDI API eller Bluetooth) | 2 | Händer upptagna på instrumentet — fot byter sida. iReal har detta. |
| 30 | **QR-kod på PDF-export** → tillbaka till levande version i DAJO | 0.5 | Pappersvärld ↔ digital. Smart detalj. |
| 31 | **Search-as-you-type med fuzzy matching** | 0.5 | När listan blir 200+ låtar. |
| 32 | **Favoriter/stjärnmärka** | 0.25 | Enkelt, värdefullt. |
| 33 | **Batch-import (20 PDF på en gång)** | 2 | För läraren eller den som digitaliserar sitt arkiv. |
| 34 | **MusicXML-export** (till Sibelius/MuseScore) | 1.5 | För riktiga arrangemang. |

**Total våg 4: ~15 dagar (exklusive native app).**

---

### ⏸️ Avvaktas medvetet (enligt din feedback)

- ~~MIDI backgroundskomp (piano/bass/drums playback)~~ → DAW-territorium. Vänta.
- ~~Audio-playback av original-låt synkat med schema~~ → coolt men inte kärnan.
- ~~Spotify/YouTube URL-import~~ → vänta, fokus på dina egna filer.
- ~~Versionshistorik ("undo till förra repet")~~ → för komplicerat för värdet.
- ~~Lärar-elev mode~~ → annan persona, senare.
- ~~AI-assisterad komponering~~ → trendigt men smalt.
- ~~Public song database (Ultimate Guitar-klon)~~ → upphovsrätts-träsk.
- ~~Ear training~~ → helt annan app.

---

## Rekommendation: starta imorgon med dessa 3

1. **Layout-kontroll (våg 1, #1)** — 2 dagar. Gör Songbook-editorn faktiskt användbar för dig.
2. **Dark mode (våg 1, #2)** — 0.5 dag. Gratis vinst.
3. **PDF-annotering i spelläge (våg 1, #3)** — 3 dagar. Detta är DEN trigger som gör att du kan använda DAJO live nästa vecka.

**Efter 5.5 dagar:** du har en app som du själv kan ta på scen — med egna låtar, egen layout, egen handskriven anteckning, mörkt tema. Då vet vi.

---

## Tekniska val jag rekommenderar (samma som förut, kortare lista)

1. **Separera audio från JSON-import** → `multipart/form-data`. Sparar 33% + mindre minne. (1 dag)
2. **Job-kö för Whisper/Demucs** (BullMQ + Redis). Kör: en användare blockerar inte nästa. (2 dagar när trafiken kräver)
3. **Vitest + supertest** — början av testgrund. Börja med `ai-import.ts`. (1 dag)
4. **GitHub Actions CI** (typecheck + test + build). (0.5 dag)
5. **Flask → egen container** med egen deploy. Senare när trafik ökar. (1 dag)

---

## Det här är inte med — och det är medvetet

- **Vi blir inte en DAW.** Inga trummor, ingen mixer, ingen MIDI-sequencer.
- **Vi blir inte Ultimate Guitar.** Inget public content library.
- **Vi blir inte Sibelius.** Full notation med stämmor, dynamik, repriser → vi gör leadsheet och kompskiss *bra*, inte fulla partitur.
- **Vi blir inte en lärplattform (än).** Fokus är det professionella bandet.

DAJO:s löfte: *från idé eller inspelning → leadsheet/kompskiss → setlist → på scen → med bandet.* Det är allt. Gör det bättre än alla andra.

---

## Snabb sammanfattning

**Våg 1 (10 dagar):** Gör DAJO till din dagliga spelapp. Layout, dark mode, PDF-annotering, ankare, setlist-PDF, transpose, textvy.

**Våg 2 (12 dagar):** Gör DAJO till kapellmästarens verktyg. Bandspaces, delade setlists, per-medlem tonart, delade anteckningar.

**Våg 3 (13 dagar):** Gör kompskiss-editorn bäst i klassen. Voicings, funktionsanalys, copy-paste, form-erkänning, syllable-alignment.

**Våg 4 (15 dagar + native):** Polera. iPad-app, Apple Pencil, MIDI pedal, batch, export.

**Total ~50 dagar fokuserat arbete** innan DAJO är komplett produkt för persona 1 (scenmusikern/kapellmästaren). Det är rimligt.

🎵
