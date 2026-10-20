# VaktLaget

**Turnus med omtanke.** Et interaktivt førsteutkast til et planleggingsverktøy for døgninstitusjoner, laget for Jo Bendik og Erik.

Hele appen er én selvstendig **[`index.html`](index.html)**. HTML, CSS, ikoner, eksempeldata og JavaScript ligger i filen. Den krever ingen installasjon, eksterne biblioteker, API-nøkler eller server. Den gjør ingen nettverkskall for appdata eller skrifttyper.

> Dette er en produktprototype med fiktive personer og forenklede regler. Den er ikke klar for faktisk turnusplanlegging, personalopplysninger eller pasientopplysninger. «Gjennomgått» i demoen er en lokal markering, ikke en publisert eller juridisk godkjent arbeidsplan.

## Åpne demoen

**[Åpne VaktLaget](https://jobendik.github.io/VaktLaget/)** · [Kildekode](https://github.com/jobendik/VaktLaget)

GitHub Pages er aktivert i repoet. Siden publiseres fra rotmappen på `main` og oppdateres etter nye push. `.nojekyll` lar HTML-filen serveres direkte, uten byggetrinn.

Alternativt kan `index.html` åpnes direkte i en nettleser. GitHub Pages anbefales for deling og mer forutsigbar lokal lagring.

## Oppdatert etter Eriks innspill

- **Mørkeblått tema er standard.** Bryteren øverst veksler mellom mørkt og lyst og husker valget i nettleseren. Utskrift bruker lys fargepalett.
- **Kompetanse telles per vakt.** Dag, kveld og natt har egne antallskrav for medisinkompetanse, erfaring og beredskapskompetanse. Nye eksempeldata krever to ulike personer med medisinkompetanse, én erfaren og to med beredskapskompetanse på hver vakt. Samme person kan oppfylle flere kompetansekrav.
- **Tilrettelegging skiller oppgave fra fravær.** En medarbeider beholder vaktene, men teller ikke i valgt oppgave i en bestemt periode. Det gjelder også nattevakter som overlapper perioden. Ingen diagnose eller privat begrunnelse registreres.
- **Myke hensyn mellom kolleger.** Velg et ønsket maksimum for antall felles vakter i seksukersperioden. Det påvirker forslagene; faktiske antall og overskridelser er synlige. Absolutte sperrer og prioriterte kombinasjoner finnes fortsatt. Absolutte krav rangeres foran myke ønsker.
- **Grunnturnus og endringer.** En lagret grunnturnus beholdes som sammenligningspunkt. Arbeidsutkastets endrede vakter vises separat, og du kan lagre et nytt sammenligningspunkt. Dette er foreløpig en sammenligning innenfor én fast seksukersperiode.

**Tidligere utprøvinger beholdes.** Versjon 1 av lokale data og JSON-sikkerhetskopier oppgraderes automatisk. Eksisterende vakter, innspill og tidligere kompetansekrav beholdes; medarbeidere får ikke nye kompetanser automatisk. For å prøve de nye eksempeldataene med to medisinpersoner og beredskap, velg **Om demoen → Tilbakestill eksempeldata**. Eksporter først dersom du vil bevare egne endringer.

## Det som finnes i førsteutkastet

| Del | Innhold |
| --- | --- |
| Oversikt | Bemanning på demodagen, oppfølging av ønsker, aktivitet og veiviser til utprøving. |
| Turnusplan | Seks uker, uke-/toukersvisning, søk, faggruppefilter, låste vakter, dagsoversikt, direkte redigering, kandidatforslag, beregning av nytt utkast og sammenligning før bruk. |
| Medarbeidere | 24 oppdiktede medarbeidere, stillingsprosent, faggruppe, medisinkompetanse, erfaring, beredskapskompetanse, tillatte og foretrukne vakttyper. Legg til, rediger eller fjern. |
| Fravær og ønsker | Sykefravær, ferie, kurs/utilgjengelighet og friønsker. Godkjenning sperrer datoer og fjerner overlappende vakter. Tilrettelegging begrenser bestemte oppgaver uten å fjerne vakten. |
| Regler og bemanning | Redigerbar hvile, timegrense, arbeidsdager på rad, kompetansekrav, bemanningsbehov for hverdag/helg og hensyn mellom to medarbeidere. |
| Innsikt | Vaktdekning, timefordeling, helger, netter, oppfylte friønsker og et uttrykkelig merket kostnadseksempel. |
| Eksport og innspill | Excel-vennlig CSV, utskrift/PDF via nettleseren, sikkerhetskopi/import av demoprosjekt som JSON og lokale innspill som kan lastes ned. |

## Et forslag til første gjennomgang med Erik

1. Åpne **Turnusplan**. Én kveldsvakt tirsdag 20. oktober mangler en medarbeider på grunn av et registrert fravær.
2. Trykk **Finn en løsning**. Sammenlign kandidatene og velg én til demoplanen.
3. Klikk på en vakt og prøv å endre vakttype eller låse den. Forsøk gjerne en kombinasjon som gir for kort hvile.
4. Åpne **Fravær & ønsker**, registrer et ønske og vurder konsekvensene av å godkjenne det.
5. Endre en bemanningsregel, lagre, og gå tilbake til turnusen for å se oppfølgingsbehovet.
6. Prøv **Tilrettelegging** under **Fravær & ønsker**, og se kompetansetallene i dagsvisningen. Under **Regler & bemanning** kan du endre antallskrav og legge inn et ønsket maksimum for felles vakter.
7. Åpne **Grunnturnus** fra kalenderen og se forskjellene fra arbeidsutkastet.
8. Trykk **Lag turnusforslag**. Prøv først å bare fylle hull, deretter å bygge en ny fordeling. Sammenlign før du bruker forslaget.
9. Skriv konkrete tilbakemeldinger under **Gi innspill**, og last dem ned for å dele dem.

**Endringer deles ikke mellom besøkende.** Hver nettleser har sin egen demoplan i `localStorage`. JSON-eksport/import kan brukes for å flytte en utprøving. Alle kan tilbakestille til de opprinnelige eksempeldataene fra «Om demoen».

## Hvordan beregningen fungerer

Appen bruker en enkel deterministisk, heuristisk søkealgoritme i JavaScript. Ved ny fordeling forsøker den flere varianter og rangerer dem etter udekkede behov, kompetanse, regelavvik, friønsker og avstand fra veiledende timemål. Eksisterende vakter kan beholdes; låste vakter beholdes alltid. Nye tildelinger må oppfylle demoens tildelingsregler.

Absolutte regelavvik og udekkede bemannings-/kompetansebehov sammenlignes før myke ønsker. Mange oppfylte ønsker kan derfor ikke veie opp for et udekket absolutt krav ved valg mellom forslag.

Generering skjer i en lokal Web Worker når nettleseren støtter dette, slik at grensesnittet kan svare mens beregningen pågår. Ellers brukes hovedtråden. Utgangsplanen er forhåndsberegnet slik at første innlasting ikke trenger å kjøre søket.

### Implementerte kontroller

- Tillatte vakttyper per medarbeider og godkjent fravær.
- Fravær som overlapper vakttid, inkludert nattevakt fra foregående dato.
- Hviletid mellom vakter og overlappende vakter innenfor demoperioden.
- En konfigurert maksimal sum vakttimer i sju sammenhengende kalenderdager. Timer henføres til datoen vakten starter.
- Et konfigurert antall påfølgende startdatoer med vakt.
- Sperrede kombinasjoner på samme vakt; prioriterte kombinasjoner og ønsket maksimum for felles vakter som myke hensyn.
- Bemanningsantall og konfigurerbare antallskrav per vakttype til medisinkompetanse, erfaring og beredskapskompetanse. 0 slår av et kompetansekrav.
- Tidsavgrenset tilrettelegging reduserer kompetansedekningen for overlappende vakter, også over midnatt.

At algoritmen lar et behov stå uløst, er **ikke** et bevis på at det ikke finnes en løsning. At den finner en løsning, er **ikke** et bevis på global optimalitet eller full lovlighet.

### Bevisste begrensninger

- Separate sommer-, jule- og påskeplaner med egne datoer, grunnturnus som gjentas over kalenderen og bemanningsunntak per dato gjenstår.
- Separat gjennomgang av leder og tillitsvalgt, identitetsbekreftelse og versjonert signering gjenstår. «Gjennomgått» er fortsatt bare en lokal demomarkering.

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

