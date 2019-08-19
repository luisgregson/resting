define(function() {

  const makeBookmarkFromJson = ({id, request, name, folder, created}) => ({ id, request, name, folder, isFolder: false, created});

  const makeFolderFromJson= ({id,name,bookmarks = [], created}) => ({id,name, bookmarks, isFolder : true, created});

  const makeBookmark = (id, request, name, folder, created = new Date()) => ({ id, request, name, folder, isFolder: false, created});

  const makeFolder= (id,name,bookmarks = [], created = new Date()) => ({id,name, bookmarks, isFolder : true, created});


  const fromJson = (json = {}) => {
    const obj = JSON.parse(json);
    if(obj.isFolder) {
      return makeFolderFromJson(obj);
    } else {
      return makeBookmarkFromJson(obj);
    }
  };

  const addBookmarks = (folder,bookmarks = []) => {
    const newFolder = Object.assign({},folder);
    newFolder.bookmarks = folder.bookmarks.concat(bookmarks);
    return newFolder;
  }

  const bookmarkById = ({ id }) => b => (b.id === id);

  const replaceBookmark = (folder,bookmark) => {
    const bookmarks = folder.bookmarks.slice();
    const indexToReplace = bookmarks.findIndex(bookmarkById(bookmark));
    if(indexToReplace !== -1) {
      bookmarks.splice(indexToReplace,1, bookmark);
    } else {
      bookmarks.push(bookmark);
    }

    return Object.assign({}, folder, {bookmarks});
  };

  const removeBookmarks = (folder,bookmarksToRemove = []) => {
    let bookmarks = folder.bookmarks.slice();

    const bookmarksToRemoveIds = (Array.isArray(bookmarksToRemove)
      ? bookmarksToRemove
      : [bookmarksToRemove])
    .map(b => b.id);

    bookmarks = bookmarks.filter(b => bookmarksToRemoveIds.indexOf(b.id) === -1);

    return Object.assign({},folder,{bookmarks});
  };

  const copyBookmark = (bookmark) => {
    return Object.assign({},bookmark);
  };

  const importHAR = (storageProvider, harContent) => (harContent) => {
    const har = JSON.parse(_escapeJsonContent(harContent));
    if(_isRestingFormat(har.log.creator)) {
      const bookmarks = importObj(har);
      // FINIRE
    }
    const harEntries = har.log.entries;
    const bookmarks = harEntries.map(entry => _convertHarEntry(storageProvider, entry));
    return bookmarks;
  };

  const _isRestingFormat = (creatorFields = {}) => {
    return creatorFields.name == 'Resting WebExtension' && creatorFields.version == '1.0';
  };

  const _escapeJsonContent = (content) => {
    if(content) {
      content = content.replace(/\n/g,'');
      content = content.replace(/\t/g,'');
      content = content.replace(/\r/g,'');
      content = content.replace(/"response":\s?{.*},"/,'"response": {},"');
    }

    return content;
  };
  const _convertHarEntry = (storage, entry) => {
    const bookmark = {};
    bookmark.id = storage.generateId();
    bookmark.name = entry.pageref;
    bookmark.request = _convertHarRequest(entry.request);
    return bookmark;
  };

  const _convertHarRequest = (harRequest = {}) => {
    const request = {};
    if(harRequest.url) {
      const querystringIndex = harRequest.url.indexOf('?');
      const endUrlIndex = querystringIndex != -1 ? querystringIndex : harRequest.url.length;
      request.url = harRequest.url.substring(0, endUrlIndex);
    }
    request.method = harRequest.method;
    if(harRequest.queryString) {
      request.querystring = harRequest.queryString.map((qs) => ({name: qs.name, value: qs.value}));
    }
    if(harRequest.headers) {
      request.headers = harRequest.headers.map(header => ({name: header.name, value: header.value}));
    }
    if(harRequest.postData) {
      request.headers.push({name:'Content-Type', value: harRequest.postData.mimeType});
      request.body = harRequest.postData.text;
    }
    return request;
  };

  const exportObj = (bookmarks = [], contexts = []) => {
      let harExport = {};
      harExport.log = {};
      harExport.log.version = '1.1';
      harExport.log.creator = {};
      harExport.log.creator.name = 'Resting WebExtension';
      harExport.log.creator.version = '1.0';
      harExport.log.entries = _bookmarkToHar(bookmarks);
      harExport.log._contexts = _contextsToHar(contexts);
      return harExport;
  };

  const _contextsToHar = (contexts = []) => {

      return contexts.map(c => {
        let contextHarField = {};
        contextHarField.name = c.name;
        contextHarField.variables = c.variables.map(v => ({name: v.name, value: v.value, enabled: v.enabled}));
        return contextHarField;
        }
      );
  };

  const _bookmarkToHar = (sources = []) => {
    let exported = [];
    if(sources.length > 0) {
      let bookmarkExport = {};
      bookmarkExport._name = sources[0].name;
      bookmarkExport._isFolder = sources[0].isFolder;
      bookmarkExport._id = sources[0].id;
      bookmarkExport._created = sources[0].created;
      bookmarkExport._folder = sources[0].folder;
      bookmarkExport.startedDateTime = ""; // not supported
      bookmarkExport.request = {headerSize: -1, bodySize: -1};
      bookmarkExport.response = {};
      bookmarkExport.cache = {};
      bookmarkExport.timings = {};
      bookmarkExport.time = -1;
      if(sources[0].request) {
        bookmarkExport.request.url = sources[0].request.url;
        bookmarkExport.request.method = sources[0].request.method;
        bookmarkExport.request.headers = sources[0].request.headers.map(h => ({name: h.name, value: h.value, _enabled: h.enabled}));
        bookmarkExport.request.queryString = sources[0].request.querystring.map(q => ({name: q.name, value: q.value, _enabled: q.enabled}));
        if(sources[0].request.body) {
          bookmarkExport.request.postData = {};
          bookmarkExport.request.postData.mimeType = _getMimeType(sources[0].request.bodyType);
          if(bookmarkExport.request.postData.mimeType === 'application/x-www-form-urlencoded' || bookmarkExport.request.postData.mimeType === 'multipart/form-data') {
            bookmarkExport.request.postData.params = sources[0].request.body.map(p => ({name: p.name, value: p.value, _enabled: p.enabled}));;
          } else {
            bookmarkExport.request.postData.text = sources[0].request.body;
          }
        }
        bookmarkExport.request._authentication = sources[0].request.authentication;
      }

      exported.push(bookmarkExport);
      if(bookmarkExport._isFolder) {
        exported = exported.concat(_bookmarkToHar(sources[0].bookmarks));
      }
      exported = exported.concat(_bookmarkToHar(sources.slice(1)));
    }

    return exported;
  };

  const _getMimeType = repr => {
    switch(repr){
      case 'form-data':
        return 'multipart/form-data';
      case 'raw':
        return 'application/json';
      default:
      case 'x-www-form-urlencoded':
        return 'application/x-www-form-urlencoded';
    }
  };

  const _getBodyType = mime => {
    switch(mime){
      case 'multipart/form-data':
        return 'form-data';
      case 'application/json':
        return 'raw';
      default:
      case 'application/x-www-form-urlencoded':
        return 'x-www-form-urlencoded';
    }
  };


  const importObj = (obj = {}) => {
      let importObj = {};
      const entries = obj.log ? obj.log.entries : undefined;
      const contexts = obj.log ? obj.log._contexts : undefined;
      if(entries) {
        const indexRelationship = _extractRelationship(entries);
        importObj.bookmarks = entries.map(e => _importEntry(e));
        importObj.bookmarks = _fixStructure(importObj.bookmarks, indexRelationship);
      }
      if(contexts) {
        importObj.contexts = contexts.map(e => _importContext(e));
      }
      return importObj;
  };

  const _fixStructure = (bookmarks, mapping) => {
    let indexBookmarks = {};
    let i = 0;
    let bookmark;
    for(bookmark of bookmarks) {
      const bookmarkId = bookmark.id;
      indexBookmarks[bookmarkId] = {obj: bookmark, position: i};
      i++;
    }
    let folderId;
    for( folderId of Object.keys(mapping) ) {
      const insideBookmarkIds = mapping[folderId];
      insideBookmarkIds.forEach(id => {
        if(!indexBookmarks[folderId].obj.bookmarks) {
          indexBookmarks[folderId].obj.bookmarks = [];
        }
        indexBookmarks[folderId].obj.bookmarks.push(indexBookmarks[id].obj);
        bookmarks.splice(indexBookmarks[id].position,1);
      });
    }

    return bookmarks;
  }

  const _extractRelationship = (entries = []) => {
    let relationMapping = {};
    entries.forEach((e) => {
      const id = e._id;
      const folderId = e._folder;
      if(folderId) {
        if(!relationMapping.folderId) {
          relationMapping[folderId] = [];
        }
        relationMapping[folderId].push(id);
      }
    });

    return relationMapping;
  };

  const _importEntry = (entry = {}) => {
    let bookmark = {};
    bookmark.request = {};
    if(entry._isFolder) {
      bookmark.isFolder = entry._isFolder;
    }
    if(entry._name) {
      bookmark.name = entry._name;
    }
    if(entry._id) {
      bookmark.id = entry._id;
    }
    if(entry._created) {
      bookmark.created = entry._created;
    }
    const entryRequest = entry.request;
    if(entryRequest.url) {
      bookmark.request.url = entryRequest.url;
    }
    if(entryRequest.method) {
      bookmark.request.method = entryRequest.method;
    }
    if(entryRequest.headers) {
      bookmark.request.headers = entryRequest.headers.map(h => ({name: h.name, value: h.value, enabled: h._enabled}));
    }

    if(entryRequest.queryString) {
      bookmark.request.querystring = entryRequest.queryString.map(h => ({name: h.name, value: h.value, enabled: h._enabled}));
    }
    if(entryRequest._authentication) {
      bookmark.request.authentication = entryRequest._authentication;
    }
    if(entryRequest.postData) {
      bookmark.request.bodyType = _getBodyType(entryRequest.postData.mimeType);
      if(entryRequest.postData.mimeType === 'multipart/form-data' || entryRequest.postData.mimeType === 'application/x-www-form-urlencoded') {
        bookmark.request.body = JSON.stringify(entryRequest.postData.params.map(p => ({name: p.name, value: p.value, enabled: p._enabled})));
      } else {
        bookmark.request.body = entryRequest.postData.text;
      }
    }
    return bookmark;
  };

  const _importContext = (entry = {}) => {
    let context = {};
    if(entry.name) {
      context.name = entry.name;
    }
    if(entry.variables) {
      context.variables = entry.variables.map(v => ({name: v.name, value: v.value, enabled: v.enabled}));
    }

    return context;
  };



  return function(storageProvider) {
      return {
        makeBookmark : makeBookmark,
        makeFolder : makeFolder,
        fromJson : fromJson,
        addBookmarks : addBookmarks,
        removeBookmarks : removeBookmarks,
        copyBookmark : copyBookmark,
        replaceBookmark : replaceBookmark,
        save : bookmark => storageProvider.save(bookmark),
        importHAR : importHAR(storageProvider),
        exportObj,
        importObj,
      };
  };
});
