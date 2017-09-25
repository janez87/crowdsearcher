[DONE]
- Nessuna delle precedenti: dovrebbe essere l’ultima opzione selezionabile per una data ragione sociale.
- Per ogni URL collegata ad una ragione sociale, vi forniremo il punteggio ottenuto dal nostro algoritmo. Sulla base di tale informazione, sarebbe opportuno ordinare le URL da proporre all’utente
- Redis per session express
- Togliere dalla UI gli object closed
- Creazione del DB i locale e messa online del DB
    + Non necessario
- Partita iva: siamo in grado di fornirla per le aziende da identificare sul web.
    + FIX CODICE AZIENDA AL POSTO DELLA PARITA IVA, DA TOGLIERE
- Offline: come concordato riteniamo opportuno inserire l’opzione offline (sito non raggiungibile) tra le scelte che l’utente può fare
    + Aggiungere categoria Offine per l'oggetto a livello di Task type
- Dovrebbe essere inserito un controllo che verifichi che l’utente ha selezionato un valore diverso da quello di default (e.g. di valore di default SELEZIONA UNA URL) per tutte le aziende  a lui assegnate.


[TOCHECK]
- Pulire il più possibile pipeline di creazione execution e chiusura Execution
    + Apertura execution lenta
    + Chiusura ?????
- Numero di aziende per pagina: possiamo ipotizzare 7-10?
- Majority check su winning category e status closed
- Aggregate majority
- Controllare il post delle answer che venga fatto correttamente
    + Sito selezionato (yes)
    + Siti offiline
    + Siti no
- REMOVE USELESS EVENT API

[TODO]
- Worker: abbiamo concordato che possano essere worker istat su base volontaria. Non sappiamo ancora quanti riusciamo ad averne, ma l’ “invito” interesserà circa 200 persone.
- Identificazione del worker: per noi sarebbe utile avere un id per ogni worker.
    + Si possono creare degli utenti e si danno le credenziali a ISTAT
- Cambiare view task da group by a count in parallelo se possibile
    - nella parte di creazione dei report per la view "task" 
- Mettere linnee dispari e pari con colori diversi
- Cambiare la assignment strategy in modo che un utente non faccia 2 volte lo stesso microtask
    + Aggiungo al mart la lista dei mTask fatti dall'utente
    + sadd | smembers
- Aggiungere selezione "nessuna" se non ho elementi disponibili nella select