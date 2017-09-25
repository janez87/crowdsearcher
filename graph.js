'use strict';

let Promise = require( 'bluebird' );
let neo4j = require( 'neo4j' );
let co = require( 'co' );

let db = new neo4j.GraphDatabase( 'http://neo4j:demo@localhost:7474' );
db = Promise.promisifyAll( db, { multiArgs: true } );

const CATEGORIES = [
  { name: 'Category0' },
  { name: 'Category1' },
  { name: 'Category2' },
  { name: 'Category3' },
  { name: 'Category4' },
  { name: 'Category5' },
];
const ITEMS = 200;

function createQuery( query, params ) {
  return db.queryAsync( query, params );
}

function* createCategories() {
  // Create categories
  for( let category of CATEGORIES ) {
    let query = 'CREATE (n:Category {category})';
    yield createQuery( query, {category} );
  }
}
function* createItems() {
  // Create items
  for( let i=0; i<ITEMS; i++ ) {
    let item = {
      name: `Culo ${i}`,
      surname: 'Culo',
    };

    let num = Math.round( Math.random()*CATEGORIES.length );
    let c1 = `Category${num}`
    num = (num+1)%CATEGORIES.length;
    let c2 = `Category${num}`

    let query = `
    MATCH
    (c1:Category { name: '${c1}' } ),
    (c2:Category { name: '${c2}' } )
    CREATE
    (el:Item {item}),
    (c1)-[:KNOWS]->(el),
    (c2)-[:KNOWS]->(el)
    `;

    yield createQuery( query, { item } ); // [ [] ]
  }
}
function* insertData() {
  yield createCategories();
  yield createItems();
}

co( function*() {
  // yield insertData();
} )
.catch( err => {
  console.error( 'FUUUU', err );
} );