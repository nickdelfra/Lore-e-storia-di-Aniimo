# Lore di Aniimo — Raccolta in Italiano

**Una raccolta in italiano dedicata alla lore, alla storia e ai capitoli del mondo di Aniimo.**

Testo ricostruito, riformulato e tradotto da **Nicola del Francia** · **Versione 2.0** · aggiornato al 28 novembre 2026

🌐 **[Apri la raccolta online](https://nickdelfra.github.io/Lore-e-storia-di-Aniimo/)**

---

## 📖 Il progetto

Questo progetto raccoglie e organizza in italiano informazioni sulla storia e sull’universo narrativo di **Aniimo**, rendendole consultabili attraverso un sito web da leggere come un libro illustrato.

La raccolta accompagna il lettore alla scoperta dei luoghi, delle creature e delle forze che plasmano il mondo di gioco, collegando la narrazione alle sue principali meccaniche.

I testi sono riassunti e riformulati a partire dalle fonti indicate: non costituiscono una traduzione letterale né una localizzazione ufficiale. I nomi propri sono mantenuti in inglese.

## 🌍 Il mondo di Aniimo

Il mondo di gioco si sviluppa su due realtà sovrapposte:

- **Astra**, la città fluttuante costruita dagli umani dopo aver lasciato la Terra.
- **Idyll**, il continente selvaggio sottostante, abitato dagli Aniimo.

Secondo la leggenda, Idyll fu creato da nove **Aeon**, ciascuno a guardia di un dominio.

Sotto la superficie scorrono le **Vene**, una rete di energia vitale legata a elementi centrali del mondo di gioco: **Rami**, **Fioriture**, **Ambra Lumin** e **Flusso Prismana**.

Nei panni di un **Pathfinder**, il giocatore esplora questo universo attraverso il **Twine**, o intreccio: un legame che permette di fondersi con un Aniimo catturato e utilizzarne direttamente movimenti e abilità.

Astra e l’**Istituto Polaris** costituiscono la base dei Pathfinder, mentre Idyll, le sue rovine e le sue energie custodiscono la storia del mondo.

## 📚 I capitoli

| Pagina | Di cosa parla |
| --- | --- |
| Introduzione | La mappa del viaggio e una guida all’uso del sito |
| Prologo | La storia di Aniimo in breve |
| 1 · Astra e l’Istituto Polaris | La città sospesa, il Preside Oswen, il Dott. Lewis, Nicole e gli strumenti dei Pathfinder (Avamposto, Aniipod, Omniguanto) |
| 2 · Idyll e l’Antica Idyll | Il continente, le rovine, le Mechina e i Santuari |
| 3 · Gli Aniimo | Le creature di Idyll, le forme, le evoluzioni, gli Aniimo Alfa e la mutazione Sparkling |
| 4 · Il Pathfinder | Chi apre la strada e il ruolo del giocatore |
| 5 · Il Twine (intreccio) | Il legame tra umano e Aniimo |
| 6 · Le Vene | Rami, Fioriture, Ambra Lumin (come si usa con il Ramo) e Flusso Prismana |
| 7 · La Costa dello Zefiro | La terra di Aeolus, Bloomville con Jaeger, Sunia e Velouria, e il mistero di Irelia |
| 8 · Leggende e murali | Le leggende dipinte di Idyll, da Helgon a Infergon e ai Pawney |
| 9 · La storia principale | La trama vissuta dal giocatore, fino agli episodi sull’acqua, e il pre-annuncio della Stagione 2 (contiene anticipazioni) |
| Glossario · Conclusione · Fonti | Parole chiave, chiusura, fonti e crediti |

## ✨ Novità

### Aggiornamenti dopo la 2.0

- Nuovi dettagli in più capitoli: i volti dell’Istituto Polaris, gli esempi di evoluzione, l’uso dell’Ambra Lumin, il seguito della leggenda di Infergon.
- Capitolo 9 ampliato con i tre episodi sull’acqua (Whisperwake Isles) e con un riquadro **«Novità in arrivo»** sulla **Stagione 2, «Echoes of the Singing Sea»**, prevista per il 10 dicembre 2026. Verrà completato quando la stagione sarà uscita.
- Il glossario comprende nuovi termini, come Skiffspear, Pilastro della Marea, Alfa e Omega, Sparkling e Stadio Nova.
- Il termine italiano **Omniguanto** sostituisce «Omni-glove».
- Un contatore di visite anonimo (GoatCounter) conta le pagine viste.

### Versione 2.0

- Una pagina per ogni capitolo, con indice sempre a portata di mano e schede per passare al capitolo precedente o successivo.
- Ricerca in tutto il testo, che porta dritta al paragrafo.
- Tema scuro con il cielo che passa dalla notte all’alba scorrendo la pagina, stelle e stelle cadenti; tema chiaro con l’interruttore giorno/notte.
- Lettore musicale che non si interrompe cambiando pagina.
- Nomi propri inglesi in grassetto la prima volta che compaiono in ogni pagina.

## 🗂️ Com’è organizzato il repository

```
contenuti/              i testi della raccolta: è qui che si modificano
  capitoli.json           elenco delle pagine, titoli e descrizioni
  nomi.json               nomi propri inglesi da mettere in grassetto
  <pagina>.html           il testo di ogni capitolo, con immagini e didascalie
strumenti/
  genera_sito.py          crea le pagine del sito partendo dai testi
docs/                   il sito pubblicato (generato: non modificarlo a mano)
  index.html, <pagina>.html
  assets/css · js · img · musica
```

### Pubblicazione

Il sito è pubblicato con GitHub Pages dalla cartella **`/docs`** del ramo `main` (Settings → Pages → Build and deployment → Branch: `main`, cartella `/docs`). L’indirizzo non cambia con le modifiche ai file: cambia solo se si rinomina il repository o l’account.

### Aggiornare un testo

1. Modifica il file del capitolo in `contenuti/` (per esempio `contenuti/astra.html`).
2. Lancia `python3 strumenti/genera_sito.py`: le pagine in `docs/` e l’indice della ricerca vengono rigenerati.
3. Pubblica le modifiche: GitHub Pages aggiorna il sito in un paio di minuti.

### Aggiungere un’immagine

1. Salva l’immagine in `docs/assets/img/<capitolo>/` (per esempio `docs/assets/img/01-astra/`).
2. Inseriscila nel testo del capitolo con il suo blocco `<figure class="illustration">` e la didascalia, come le altre.
3. Rigenera il sito con lo script.

## 🔎 Fonti

La raccolta fa riferimento alle seguenti risorse. I siti fan e le guide della community non costituiscono fonti ufficiali.

| Fonte | Contenuto di riferimento |
| --- | --- |
| AniimoTools — sito fan non ufficiale | Lore, capitoli della storia, note di aggiornamento e guida al Twining |
| aniimo.guide | Riassunto completo della storia, versione 1.0 |
| Sito ufficiale di Aniimo | Annuncio della Stagione 2 |
| Gamespace | Anteprima di Departure with the Wind: Part 2 |
| AniimoVerse | Echoes of the Singing Sea: Tempestra Journey |
| VGMag | Data della Stagione 2 |
| Xbox Wire | Presentazione di Aniimo |
| Dexerto | Aniimo Wiki |
| Metabot | Database Aniimo e missioni principali |
| Games.gg | Guida per principianti e guida all’Homeland |
| All Things How | Guida all’Homeland |
| Destructoid | Homeland |
| ItemLevel | Lavoratori dell’Homeland |
| GameWith | Coltivazione e guida alla Main Story |
| Neonsect | Home e RV |
| Fandomwire | Consigli per iniziare |
| ZeroLuck | Glossario |
| TheGamesWiki | Pagina sui Pathfinder |
| GameTrek | Guida alla storia |
| Everyeye | Recensione |

Le informazioni possono cambiare con gli aggiornamenti del gioco. La raccolta può contenere imprecisioni, interpretazioni o informazioni non più aggiornate.

## ✍️ Autore e metodo di lavoro

**Nicola del Francia** ha curato la ricostruzione, la traduzione e la riformulazione dei testi in italiano.

Il lavoro consiste nel riunire informazioni provenienti da più fonti e organizzarle in una narrazione accessibile, mantenendo i nomi propri in inglese.

Le nozioni sulla **Costa dello Zefiro**, sulle **Mechina**, sui **Santuari** e sul **viaggio rapido** sono state raccolte da Nicola del Francia.

## 🤝 Segnalazioni e contributi

Correzioni, precisazioni e suggerimenti sono benvenuti.

Per proporre una modifica puoi inviare una **Pull Request** a questo repository, modificando i file in `contenuti/` e indicando:

- la sezione interessata;
- l’errore riscontrato o l’informazione da aggiungere;
- la modifica proposta;
- una fonte verificabile a supporto, quando disponibile.

## 🙏 Crediti e diritti

### Progetto non ufficiale

Questa raccolta è un progetto amatoriale e non ufficiale dedicato ad Aniimo. Non è affiliata, sponsorizzata o approvata dagli sviluppatori o dagli editori del gioco.

### Immagini e materiali di gioco

Le illustrazioni e le schermate provengono da materiali di Aniimo. Alcune immagini riportano la filigrana della fonte da cui provengono.

Aniimo, i relativi marchi e i materiali di gioco appartengono ai rispettivi titolari, tra cui **Pawprint Studio / FunPlus**.

### Musica

**«March of Progress» — MALO**

Tutti i diritti appartengono ai rispettivi titolari.

### Testi della raccolta

Testi ricostruiti, riassunti, riformulati e tradotti da **Nicola del Francia**, sulla base delle fonti elencate.

La pubblicazione nel repository non concede automaticamente diritti di riutilizzo sui materiali di terzi.

## ☕ Sostieni il progetto

Se la raccolta ti è utile, puoi sostenere il lavoro su **[paypal.me/nickdelfra](https://paypal.me/nickdelfra)**.

---

**Lore di Aniimo · Raccolta in italiano · Versione 2.0**  
A cura di **Nicola del Francia**
