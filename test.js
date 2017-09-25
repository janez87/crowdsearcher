'use strict';
let url = require( 'url' );
let fs = require( 'fs' );

let Chance = require( 'chance' );

let chance = new Chance();
const numAziende = 80000;
const numLinks = 10;

let arr = [];
for( let a=0; a<numAziende; a++ ) {
  let codice = ''+chance.natural();
  // let codice = chance.ssn();
  let nome = chance.name();
  let iva = chance.ssn();
  let numUrls = chance.natural( { max: numLinks } );

  for( let u=0; u<numUrls; u++ ) {
    let consideredUrl = chance.url();
    let mainUrl = url.parse( consideredUrl );
    mainUrl.pathname = null;
    mainUrl = url.format( mainUrl );
    let score = chance.natural( { max: 1000 } );

    let data = {
      CODICE_AZIENDA: codice,
      PARTITA_IVA: iva,
      CODICE_LINK: u,
      RAGIONE_SOCIALE: nome,
      URL: consideredUrl,
      URL_CONSIDERATO: mainUrl,
      PUNTEGGIO: score,
      MATCH: chance.bool()? '1' : '0',
    }

    // console.log( '%j', data );
    arr.push( data );
  }
}

fs.writeFileSync( 'sample.json', JSON.stringify( {
  data: arr,
}, null, 1 ), 'utf8' );