const Nightmare = require('nightmare');
const path = require('path');

describe('UI Flow Tests', function() {
  let nightmare = null;
  
  beforeEach(() => {
    nightmare = new Nightmare({ show: false })
  });

  // Actually not fully working: insert .campo-url value in uncorrect field
  // FIX load dynamically index page URL
  it('load addon page and save a bookmark', function(done) {
    pending(); // TEST DISABLE
    //const indexFilePath = path.resolve('../../src/index.html');
    nightmare.goto('file:///home/mirko/personal/resting-github/src/index.html')
    .select('#method', 'POST')
    .type('.campo-url', 'service.org/api/service')
    .click('#save-button')
    .wait('#save-bookmark-dialog')
    .click('#confirm-save-button')
    .wait('.element')
    .evaluate( () => {
        const bookmarkNumber = document.querySelectorAll( ".bookmark" ).length;
        const evaluation = {};
        evaluation.size = bookmarkNumber;
        if(bookmarkNumber > 0 ) {
          const nodeBookmark = document.querySelector('div.element > a.bookmark > span');
          console.log("",nodeBookmark);
          evaluation.name = nodeBookmark.textContent
        }
        return evaluation;
          
     })
    .end()
    .then( evaluation => {
      expect(evaluation.size).toBe(1)
      expect(evaluation.name).toBe('POST service.org/api/service');
      done();
    })
    .catch(() => { expect(false).toBe(true); done() })
  }, 60000);
  
  
});
