 define(['knockout', 'app/bookmark', 'app/storage', 'component/bookmarks/bookmarkVm'],function(ko, makeBookmarkProvider, storage, BookmarkVm) {

  return function BookmarksVm(params) {

    const appVm = params.appVm;


    let bookmarkToDelete = null;
    const bookmarkToDeleteName = ko.observable();
    const tryToDeleteFolder = ko.observable(false);
    const showBookmarkDeleteDialog = ko.observable(false);
    const showFolderDialog = ko.observable(false);
    const folderName = ko.observable();

    // FIXME: direct ref to bookmarks in appVm
    const bookmarks = params.bookmarks;

    const folders= ko.observableArray();

    folders.subscribe( newValue => {
      appVm.folders.removeAll();
      newValue.forEach(folder => appVm.folders.push(folder));
    });

    const deleteChildrenBookmarks = ko.observable();


    const bookmarkProvider = makeBookmarkProvider(storage);

    const confirmDelete = bookmark => {
      bookmarkToDelete = bookmark;
      bookmarkToDeleteName(bookmark.viewName());
      tryToDeleteFolder(bookmark.isFolder);
      showBookmarkDeleteDialog(true);
    };

    const _serializeBookmark = (bookmarkObj) => {
      return bookmarkProvider.fromJson(JSON.stringify(bookmarkObj));
    }

    const addFolder = () => {
      const folder = bookmarkProvider.makeFolder(new Date().toString(), folderName());
      storage.save(_serializeBookmark(folder));
      bookmarks.push(new BookmarkVm(folder));
      folders.push(folder);
      folderName('');

      // close the dialog
      dismissFolderDialog();
    };

    const folderDialog = () => {
      showFolderDialog(true);
    };

    const dismissFolderDialog = () => {
      showFolderDialog(false);
    };

    const addFolderOnEnter = (data,event) => {
      const enter = 13;
      if(event.keyCode === enter) {
        addFolder();
      }
    };

    const _loadBookmarksNewFormat = () =>
      storage.iterate( value => {
        bookmarks.push(new BookmarkVm(value));
        if(value.isFolder) {
          folders.push(value);
        }
    });

    const deleteBookmarkFromView = () => {
      deleteBookmark(bookmarkToDelete, deleteChildrenBookmarks());
      folders.remove(folder => folder.id === bookmarkToDelete.id);
      bookmarkToDelete = null;
      dismissDeleteBookmarkDialog();
    }

    const dismissDeleteBookmarkDialog = () => {
      showBookmarkDeleteDialog(false);
      deleteChildrenBookmarks(false);
    }

    const deleteBookmark = (bookmark, deleteChildrenBookmarks) => {
      if(bookmark.folder) {
        const containerFolder = bookmarks().find( b => b.id === bookmark.folder);
        let modifiedFolder = Object.assign({},containerFolder);
        modifiedFolder.bookmarks = containerFolder.bookmarks.filter(b => b.id !== bookmark.id);
        bookmarkProvider.save(_serializeBookmark(modifiedFolder));
        bookmarks.replace(containerFolder,modifiedFolder);
      } else {
        if(bookmark.isFolder && !deleteChildrenBookmarks) {
          const childrenBookmarks = bookmark.bookmarks.map( child => {
            child.folder=null;
            return child;
          });
          //FIXME: bad use _saveBookmark from appVm
          childrenBookmarks.forEach(child => appVm._saveBookmark(child));
        }
        storage.deleteById(bookmark.id, () => bookmarks.remove(bookmark));
      }

       if( bookmark.id == appVm.bookmarkSelected.id()) {

         appVm.bookmarkCopy = null;
         appVm.folderSelected('');

         appVm.bookmarkSelected.id('');
         appVm.bookmarkSelected.name('');
      }
    };

    // FIXME direct interaction with appVm fields
     const loadBookmarkObj = (bookmarkObj) => {
      appVm.bookmarkCopy = bookmarkProvider.copyBookmark(bookmarkObj);
      appVm.folderSelected(bookmarkObj.folder);
      appVm.clearResponse();
      return loadBookmarkData(bookmarkObj);
    };

    // FIXME direct interaction with appVm fields
    const loadBookmarkData = (bookmark) => {
      appVm.parseRequest(bookmark.request);
      appVm.loadBookmarkInView(bookmark);
    };

    $(() => {
      const screenWidth = screen.width;
      const dialogLeftPosition = screenWidth / 2  - 200;
      $('div.dialog').css('left', dialogLeftPosition+'px');
    });

    // define the storage format conversion
    // this function converts format of bookmarks to the new version
    // consider to maintain the call until version <= 0.6.0 of web-extentsion for compatibility goal
    (() => {
      storage.iterate( value => {
        try {
         const bookmarkObj = bookmarkProvider.fromJson(value);
         bookmarkProvider.save(bookmarkObj);
        } catch(e) {
          console.log('bookmark/folder already converted in new format');
        }
      }, (err,success) => {
        if(!err) {
          _loadBookmarksNewFormat();
        }
      });
    })();


    return {
      showFolderDialog,
      folderName,
      folderDialog,
      dismissFolderDialog,
      addFolderOnEnter,
      addFolder,
      folders,
      bookmarks,
      showBookmarkDeleteDialog,
      bookmarkToDeleteName,
      tryToDeleteFolder,
      deleteChildrenBookmarks,
      deleteBookmark,
      confirmDelete,
      dismissDeleteBookmarkDialog,
      deleteBookmarkFromView,
      loadBookmarkObj,
      loadBookmarkData,
    };
  }

});