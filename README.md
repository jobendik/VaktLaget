# VaktLaget

**Turnus med omtanke.** Et interaktivt førsteutkast til et planleggingsverktøy for døgninstitusjoner, laget for Jo Bendik og Erik.

Hele appen er én selvstendig **[`index.html`](index.html)**. HTML, CSS, ikoner, eksempeldata og JavaScript ligger i filen. Den krever ingen installasjon, eksterne biblioteker, API-nøkler eller server. Den gjør ingen nettverkskall for appdata eller skrifttyper.

> Dette er en produktprototype med fiktive personer og forenklede regler. Den er ikke klar for faktisk turnusplanlegging, personalopplysninger eller pasientopplysninger. «Gjennomgått» i demoen er en lokal markering, ikke en publisert eller juridisk godkjent arbeidsplan.

## Åpne som nettside med GitHub Pages

Repoet er klargjort for publisering fra rotmappen på `main`:

1. Åpne **[Settings → Pages](https://github.com/jobendik/VaktLaget/settings/pages)**.
2. Under **Build and deployment**, sett **Source** til **Deploy from a branch**.
3. Velg **main** og **/ (root)**, og trykk **Save**.
4. Vent til GitHub viser at publiseringen er ferdig.

Da blir adressen normalt **https://jobendik.github.io/VaktLaget/**. Adressen blir ikke aktiv bare fordi filene er pushet; Pages må først være aktivert i innstillingene. Repoets store bokstaver er med i URL-en.

Ved nye push til `main` oppdateres siden automatisk etter at Pages er aktivert. Ingen separat byggeprosess er nødvendig. `.nojekyll` gjør at filene serveres som en statisk nettside.

Alternativt kan `index.html` åpnes direkte i en nettleser. Lokal lagring kan være begrenset når siden åpnes som en fil; GitHub Pages anbefales når demoen skal prøves over tid eller deles.

## Det som finnes i førsteutkastet

| Del | Innhold |
| --- | --- |
| Oversikt | Bemanning på demodagen, oppfølging av ønsker, aktivitet og veiviser til utprøving. |
| Turnusplan | Seks uker, uke-/toukersvisning, søk, faggruppefilter, låste vakter, dagsoversikt, direkte redigering, kandidatforslag, beregning av nytt utkast og sammenligning før bruk. |
| Medarbeidere | 24 oppdiktede medarbeidere, stillingsprosent, faggruppe, medisinkompetanse, erfaring, tillatte og foretrukne vakttyper. Legg til, rediger eller fjern. |
| Fravær og ønsker | Sykefravær, ferie, kurs/utilgjengelighet og friønsker. Godkjenning sperrer datoer og fjerner overlappende vakter. |
| Regler og bemanning | Redigerbar hvile, timegrense, arbeidsdager på rad, kompetansekrav, bemanningsbehov for hverdag/helg og hensyn mellom to medarbeidere. |
| Innsikt | Vaktdekning, timefordeling, helger, netter, oppfylte friønsker og et uttrykkelig merket kostnadseksempel. |
| Eksport og innspill | Excel-vennlig CSV, utskrift/PDF via nettleseren, sikkerhetskopi/import av demoprosjekt som JSON og lokale innspill som kan lastes ned. |

## Et forslag til første gjennomgang med Erik

1. Åpne **Turnusplan**. Én kveldsvakt tirsdag 20. oktober mangler en medarbeider på grunn av et registrert fravær.
2. Trykk **Finn en løsning**. Sammenlign kandidatene og velg én til demoplanen.
3. Klikk på en vakt og prøv å endre vakttype eller låse den. Forsøk gjerne en kombinasjon som gir for kort hvile.
4. Åpne **Fravær & ønsker**, registrer et ønske og vurder konsekvensene av å godkjenne det.
5. Endre en bemanningsregel, lagre, og gå tilbake til turnusen for å se oppfølgingsbehovet.
6. Trykk **Lag turnusforslag**. Prøv først å bare fylle hull, deretter å bygge en ny fordeling. Sammenlign før du bruker forslaget.
7. Skriv konkrete tilbakemeldinger under **Gi innspill**, og last dem ned for å dele dem.

**Endringer deles ikke mellom besøkende.** Hver nettleser har sin egen demoplan i `localStorage`. JSON-eksport/import kan brukes for å flytte en utprøving. Alle kan tilbakestille til de opprinnelige eksempeldataene fra «Om demoen».

## Hvordan beregningen fungerer

Appen bruker en enkel deterministisk, heuristisk søkealgoritme i JavaScript. Ved ny fordeling forsøker den flere varianter og rangerer dem etter udekkede behov, kompetanse, regelavvik, friønsker og avstand fra veiledende timemål. Eksisterende vakter kan beholdes; låste vakter beholdes alltid. Nye tildelinger må oppfylle demoens tildelingsregler.

Generering skjer i en lokal Web Worker når nettleseren støtter dette, slik at grensesnittet kan svare mens beregningen pågår. Ellers brukes hovedtråden. Utgangsplanen er forhåndsberegnet slik at første innlasting ikke trenger å kjøre søket.

### Implementerte kontroller

- Tillatte vakttyper per medarbeider og godkjent fravær.
- Fravær som overlapper vakttid, inkludert nattevakt fra foregående dato.
- Hviletid mellom vakter og overlappende vakter innenfor demoperioden.
- En konfigurert maksimal sum vakttimer i sju sammenhengende kalenderdager. Timer henføres til datoen vakten starter.
- Et konfigurert antall påfølgende startdatoer med vakt.
- Sperrede kombinasjoner på samme vakt; ønskede kombinasjoner som en myk prioritering.
- Bemanningsantall, minst én erfaren og minst én med medisinkompetanse per vakt, hvis disse reglene er aktivert.

At algoritmen lar et behov stå uløst, er **ikke** et bevis på at det ikke finnes en løsning. At den finner en løsning, er **ikke** et bevis på global optimalitet eller full lovlighet.

### Bevisste begrensninger

- Ingen fullstendig modell av arbeidsmiljølov, tariffavtaler, lokale arbeidstidsavtaler eller medleverordninger.
- Ingen kontroll av sammenhengende ukentlig hvile, pauser, faktisk arbeidstid, samtykke eller varsling ved endret arbeidsplan.
- Ingen arbeidstidshistorikk før eller etter de seks ukene, eller fra andre enheter/arbeidsgivere.
- Vakttimer bruker forenklet klokketidsregning; sommertid/vintertid og kalenderavhengige tillegg er ikke modellert.
- Stillingsprosent gir bare et veiledende fordelingsmål: 35,5 timer × prosent × seks uker. Ferie og kurs er ikke trukket fra timemålet.
- Kostnader er demonstrasjon med faste satser. Timer over timemålet skal ikke tolkes som juridisk overtid eller lønnsgrunnlag.
- Ingen faktisk innlogging, datadeling, serverlagring, tilgangsstyring, Gat-integrasjon, lønnseksport eller meldinger til ansatte.
- Ingen automatisk vurdering av faglig forsvarlighet. Kjønn og pasientopplysninger brukes ikke.

## Teknisk vedlikehold

Filer:

- `index.html`: hele nettappen, inkludert eksempeldata og beregningsmodell.
- `.nojekyll`: publiseringsmarkør for statisk GitHub Pages.
- `tests/model.test.cjs`: automatiske tester av beregninger, grenser, import, eksport og generert HTML.

Kjør kontrollene med Node.js 20 eller nyere:

```sh
node --test tests/model.test.cjs
```

Testene har ingen avhengigheter. De leser appens innebygde skript og tester den faktiske beregningsmodellen. De er ikke en sertifisering av regelverket eller en erstatning for visuell nettlesertesting.

En neste produksjonsrettet versjon bør starte med ett verifisert regelsett for én avdeling, representative scenarier, en egnet optimeringsløser og eksplisitte kriterier for kvalitet og tidsbesparelse.
