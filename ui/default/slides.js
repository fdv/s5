// S5 v1.2a1 slides.js -- released into the Public Domain
//
// Please see http://www.meyerweb.com/eric/tools/s5/credits.html for information
// about all the wonderful and talented contributors to this code!
var undef;

var S5 = function() {
  this.slides;
  this.slideCSS = '';
  this.snum = 0;
  this.smax = 1;
  this.incpos = 0;
  this.number = undef;
  this.s5mode = true;
  this.defaultView = 'slideshow';
  this.controlVis = 'visible';

  this.s5NotesWindow;
  this.s5NotesWindowLoaded = false;
  this.previousSlide = 0;
  this.presentationStart = new Date();
  this.slideStart = new Date();

  this.countdown = {
    timer: 0,
    state: 'pause',
    start: new Date(),
    end: 0,
    remaining: 0
  };


  this.isIE = navigator.appName == 'Microsoft Internet Explorer' && navigator.userAgent.indexOf('Opera') < 1 ? 1 : 0;
  this.isOp = navigator.userAgent.indexOf('Opera') > -1 ? 1 : 0;
  this.isGe = navigator.userAgent.indexOf('Gecko') > -1 && navigator.userAgent.indexOf('Safari') < 1 ? 1 : 0;
}

S5.prototype.hasValue = function(object, value) {
  //TODO: defer this to a library?
  //seaches given object for the value- used for finding link relationship types in @rel's
  if (!object) return false;
  return (object.search('(^|\\s)' + value + '(\\s|$)') != -1);
}

S5.prototype.isParentOrSelf = function(element, id) {
  //TODO: defer this to a library?
  if (element == null || element.nodeName == 'BODY') return false;
  else if (element.id == id) return true;
  else return this.isParentOrSelf(element.parentNode, id);
}

S5.prototype.nodeValue = function(node) {
  var result = "";
  if (node.nodeType == 1) { //TODO: lookup these node types, eliminate the magic numbers
    var children = node.childNodes;
    for (var i = 0, l = children.length; i < l; i++) {
      result += nodeValue(children[i]);
    }
  } else if (node.nodeType == 3) {
    result = node.nodeValue;
  }
  return(result);
}

S5.prototype.slideLabel = function() {
  //not quite certain what this does. does it just build the option list of slides?
  // appears to also add id's to the slides
  var slideColl = this.slides;
  var list = $('jumplist');
  this.smax = slideColl.length;
  for (var i = 0, l = slideColl.length; i < l; i++) {
    var obj = slideColl[i];

    var did = 'slide' + i.toString();
    obj.setAttribute('id', did);

    //if (isOp) continue;   // Opera fix (hallvord)

    var otext = '';
    var menu = obj.firstChild;
    if (!menu) continue; // to cope with empty slides
    while (menu && menu.nodeType == 3) {
      menu = menu.nextSibling;
    }
    if (!menu) continue; // to cope with slides with only text nodes

    var menunodes = menu.childNodes;
    for (var j = 0, m = menunodes.length; j < m; j++) {
      otext += this.nodeValue(menunodes[j]);
    }
    list.options[list.length] = new Option(i + ' : '  + otext, i); // security error?
  }
}

S5.prototype.currentSlide = function() {
  //builds the HTML shown on the slide to indicate the current slide
  var cs = $('currentSlide');
  cs.innerHTML = '<a id="plink" href="">' + 
    '<span id="csHere">' + this.snum + '<\/span> ' + 
    '<span id="csSep">\/<\/span> ' + 
    '<span id="csTotal">' + (this.smax - 1) + '<\/span>' +
    '<\/a>'
    ;
  if (this.snum == 0) {
    cs.style.visibility = 'hidden';
  } else {
    cs.style.visibility = 'visible';
  }
}

S5.prototype.go = function(step) {
  //move forward `step` slides
  //TODO: cleanup and split up
  if ($('slideProj').disabled || step == 0) return;
  var jl = $('jumplist');
  var cid = 'slide' + this.snum;
  var ce = $(cid);
  if (this.incrementals[this.snum].length > 0) {
    for (var i = 0, l = this.incrementals[this.snum].length; i < l; i++) {
      removeElementClass(this.incrementals[this.snum][i], 'current');
      removeElementClass(this.incrementals[this.snum][i], 'incremental');
    }
  }
  if (step != 'j') {
    this.snum += step;
    lmax = this.smax - 1;
    if (this.snum > lmax) this.snum = lmax;
    if (this.snum < 0) this.snum = 0;
  } else {
    //apparently, 'j' means to look for the value in the jump list.
    this.snum = parseInt(jl.value);
  }
  var nid = 'slide' + this.snum;
  var ne = $(nid);
  if (!ne) {
    ne = $('slide0');
    this.snum = 0;
  }
  if (step < 0) {
    this.incpos = this.incrementals[this.snum].length
  } else {
    this.incpos = 0;
  }
  if (this.incrementals[this.snum].length > 0 && this.incpos == 0) {
    for (var i = 0, l = this.incrementals[this.snum].length; i < l; i++) {
      if (hasElementClass(this.incrementals[this.snum][i], 'current')) {
        this.incpos = i + 1;
      } else {
        addElementClass(this.incrementals[this.snum][i], 'incremental');
      }
    }
  }
  if (this.incrementals[this.snum].length > 0 && this.incpos > 0) {
    addElementClass(this.incrementals[this.snum][this.incpos - 1], 'current');
  }
  if (this.isOp) { //hallvord
    location.hash = nid;
  } else {
    ce.style.visibility = 'hidden'; 
    ne.style.visibility = 'visible';
    location.hash = nid;
  } // /hallvord
  jl.selectedIndex = this.snum;
  this.currentSlide();
  this.loadNotes();
  this.permaLink();
  this.number = undef;
}

S5.prototype.goTo = function(target) {
  if (target >= this.smax || target == this.snum) return;
  this.go(target - this.snum);
}

S5.prototype.subgo = function(step) {
  //for moving forward within a slide (ie, building  and taking down incrementals)
  if (step > 0) {
    if(this.incrementals[this.snum][this.incpos - 1]) removeElementClass(this.incrementals[this.snum][this.incpos - 1], 'current'); //MochiKit workaround
    removeElementClass(this.incrementals[this.snum][this.incpos], 'incremental');
    addElementClass(this.incrementals[this.snum][this.incpos], 'current');
    this.incpos++;
  } else {
    this.incpos--;
    removeElementClass(this.incrementals[this.snum][this.incpos], 'current');
    addElementClass(this.incrementals[this.snum][this.incpos], 'incremental');
    if (this.inpos > 0) {
      addElementClass(this.incrementals[this.snum][this.incpos - 1], 'current');
    }
  }
  this.loadNotes();
}

S5.prototype.toggle = function() {
  //switches between slide view and outline view
  var slideColl = this.slides;
  var slideProj = $('slideProj');
  var outline = $('outlineStyle');
  if (!slideProj.disabled) {
    // are these variable saying the same thing? aren't they just opposites?
    slideProj.disabled = true;
    outline.disabled = false;
    this.s5mode = false;
    this.fontSize('1em');
    for (var i = 0, l = slideColl.length; i < l; i++) {
      var slide = slideColl[i];
      slide.style.visibility = 'visible';
    }
  } else {
    slideProj.disabled = false;
    outline.disabled = true;
    this.s5mode = true;
    this.fontScale();
    for (var i = 0, l = slideColl.length; i < l; i++) {
      var slide = slideColl[i];
      slide.style.visibility = 'hidden';
    }
    slideColl[this.snum].style.visibility = 'visible';
  }
}

S5.prototype.showHide = function(action) {
  //not sure what this is used for, isn't demonstrated in the default slideshow
  var obj = getElementsByTagAndClassName('*','hideme')[0];
  switch (action) {
    case 's': obj.style.visibility = 'visible'; break;
    case 'h': obj.style.visibility = 'hidden'; break;
    case 'k':
      if (obj.style.visibility != 'visible') {
        obj.style.visibility = 'visible';
      } else {
        obj.style.visibility = 'hidden';
      }
    break;
  }
}

// 'keys' code adapted from MozPoint (http://mozpoint.mozdev.org/)
//TODO: reseach mozpoint
S5.prototype.keys = function(e) {
  //handles keypresses
  //TODO: could this be cleaned up?
  key = e.key()
  if (!key) {
    key = event;
    key.which = key.keyCode;
  }
  if (key.which == 84) {
    this.toggle();
    return;
  }
  if(!key.which){
    key.which = key.code;
  }
  if (this.s5mode) {
    switch (key.which) {
      case 10: // return
      case 13: // enter
        if (window.event && this.isParentOrSelf(window.event.srcElement, 'controls')) return;
        if (key.target && this.isParentOrSelf(key.target, 'controls')) return;
        if(this.number != undef) {
          this.goTo(this.number);
          break;
        }
      case 32: // spacebar
      case 34: // page down
      case 39: // rightkey
      case 40: // downkey
        if(this.number != undef) {
          this.go(this.number);
        } else if (!this.incrementals[this.snum] || this.incpos >= this.incrementals[this.snum].length) {
          this.go(1);
        } else {
          this.subgo(1);
        }
        break;
      case 33: // page up
      case 37: // leftkey
      case 38: // upkey
        if(this.number != undef) {
          this.go(-1 * this.number);
        } else if (!this.incrementals[this.snum] || this.incpos <= 0) {
          this.go(-1);
        } else {
          this.subgo(-1);
        }
        break;
      case 36: // home
        this.goTo(0);
        break;
      case 35: // end
        this.goTo(this.smax - 1);
        break;
      case 67: // c
        this.showHide('k');
        break;
      case 78: // n
        this.createNotesWindow();
        break;
    }
    if (key.which < 48 || key.which > 57) {
      this.number = undef;
    } else {
      if (window.event && this.isParentOrSelf(window.event.srcElement, 'controls')) return;
      if (key.target && this.isParentOrSelf(key.target, 'controls')) return;
      this.number = (((this.number != undef) ? this.number : 0) * 10) + (key.which - 48);
    }
  }
  return false;
}

S5.prototype.clicker = function(e) {
  //handles mouse clicks
  this.number = undef;
  var target;
  //not sure what the point was in the following
/*  if (window.event) {
    target = window.event.srcElement;
    e = window.event;
  } else {
    target = e.target;
  }*/
  if (e.target().href != null ||
      this.hasValue(e.target().rel, 'external') ||
      this.isParentOrSelf(e.target(), 'controls') ||
      this.isParentOrSelf(e.target(),'embed') ||
      this.isParentOrSelf(e.target(),'object'))
    return true;
  if (!e.which || e.which == 1) {
    if (!this.incrementals[this.snum] || this.incpos >= this.incrementals[this.snum].length) {
      this.go(1);
    } else {
      this.subgo(1);
    }
  }
}

S5.prototype.findSlide = function(hash) {
  //finds a slide based on `hash` - not sure of the constrains on `hash`
  var target = null;
  for (var i = 0, l = this.slides.length; i < l; i++) {
    var targetSlide = this.slides[i];
    //TODO: should we support @name? why?
    if ((targetSlide.name && targetSlide.name == hash)
     || (targetSlide.id && targetSlide.id == hash)) {
      target = targetSlide;
      break;
    }
  }
  while(target != null && target.nodeName != 'BODY') {
    if (hasElementClass(target, 'slide')) {
      return parseInt(target.id.slice(5));
    }
    target = target.parentNode;
  }
  return null;
}

S5.prototype.slideJump = function() {
  //jumps to the slide specified by the fragment identifier in the URL
  if (window.location.hash == null) return;
  var sregex = /^#slide(\d+)$/;
  var matches = sregex.exec(window.location.hash);
  var dest = null;
  if (matches != null) {
    dest = parseInt(matches[1]);
  } else {
    dest = this.findSlide(window.location.hash.slice(1));
  }
  if (dest != null){
    this.go(dest - this.snum);
  }
}

S5.prototype.fixLinks = function() {
  //I *think* this changes refereneces to fragment identifiers on the page into proper javascript  for displaying that slide
  var thisUri = window.location.href;
  thisUri = thisUri.slice(0, thisUri.length - window.location.hash.length);
  var aelements = getElementsByTagAndClassName('a');
  for (var i = 0, l = aelements.length; i < l; i++) {
    var a = aelements[i].href;
    var slideID = a.match('\#slide[0-9]{1,2}');
    if ((slideID) && (slideID[0].slice(0,1) == '#')) { //TODO: put this second part in the regex
      var dest = this.findSlide(slideID[0].slice(1));
      if (dest != null) {
        if (aelements[i].addEventListener) { // TODO: switch to MochiKit
          aelements[i].addEventListener("click", new Function("e",
            "if ($('slideProj').disabled) return;" +
            "s.goTo(" + dest + "); " +
            "if (e.preventDefault) e.preventDefault();"), true);
        } else if (aelements[i].attachEvent) { // TODO: switch to MochiKit
          aelements[i].attachEvent("onclick", new Function("",
            "if ($('slideProj').disabled) return;" +
            "s.goTo(" + dest + "); " +
            "event.returnValue = false;"));
        }
      }
    }
  }
}

S5.prototype.externalLinks = function() {
  //adds @target="_blank" to all links with @rel~="external". ick
  var anchors = getElementsByTagAndClassName('a');
  for (var i = 0, l = anchors.length; i < l; i++) {
    var anchor = anchors[i];
    if (anchor.getAttribute('href') && this.hasValue(anchor.rel, 'external')) {
      anchor.target = '_blank';
      addElementClass(anchor,'external');
    }
  }
}

S5.prototype.permaLink = function() {
  //sets the permalink for the current slide
  $('plink').href = window.location.pathname + '#slide' + this.snum.toString();
}

S5.prototype.createControls = function() {
  // builds the HTML for the controls widget
  var controlsDiv = $("controls");
  if (!controlsDiv) return;
  var hider = ' onmouseover="s.showHide(\'s\');" onmouseout="s.showHide(\'h\');"';
  var hideDiv, hideList = '';
  if (this.controlVis == 'hidden') {
    hideDiv = hider;
  } else {
    hideList = hider;
  }
  controlsDiv.innerHTML = '<form action="#" id="controlForm"' + hideDiv + '>' +
  '<div id="navLinks">' +
  '<a accesskey="n" id="show-notes" href="javascript:s.createNotesWindow();" title="Show Notes">&equiv;<\/a>' +
  '<a accesskey="t" id="toggle" href="javascript:s.toggle();">&#216;<\/a>' +
  '<a accesskey="z" id="prev" href="javascript:s.go(-1);">&laquo;<\/a>' +
  '<a accesskey="x" id="next" href="javascript:s.go(1);">&raquo;<\/a>' +
  '<div id="navList"' + hideList + '><select id="jumplist" onchange="s.go(\'j\');"><\/select><\/div>' +
  '<\/div><\/form>';
  if (this.controlVis == 'hidden') {
    var hidden = $('navLinks');
  } else {
    var hidden = $('jumplist');
  }
  addElementClass(hidden,'hideme');
}

S5.prototype.fontScale = function() {  // causes layout problems in FireFox that get fixed if browser's Reload is used; same may be true of other Gecko-based browsers
  //scales the base font-size for the document, based on window size, baseline at 16px for 1025x768
  if (!this.s5mode) return false;
  var vScale = 48;  // both yield 16 (the usual browser default) at 1024x768
  var hScale = 64;  // perhaps should auto-calculate based on theme's declared value?
  if (window.innerHeight) {
    var vSize = window.innerHeight;
    var hSize = window.innerWidth;
  } else if (document.documentElement.clientHeight) {
    var vSize = document.documentElement.clientHeight;
    var hSize = document.documentElement.clientWidth;
  } else if (document.body.clientHeight) {
    var vSize = document.body.clientHeight;
    var hSize = document.body.clientWidth;
  } else {
    var vSize = 700;  // assuming 1024x768, minus chrome and such
    var hSize = 1024; // these do not account for kiosk mode or Opera Show
  }
  var newSize = Math.min(Math.round(vSize/vScale),Math.round(hSize/hScale));
  this.fontSize(newSize + 'px');
  if (this.isGe) {  // hack to counter incremental reflow bugs
    var obj = getElementsByTagAndClassName('body')[0];
    obj.style.display = 'none';
    obj.style.display = 'block';
  }
}

S5.prototype.fontSize = function(value) {
  //sets the font size for the document. If neccessary, it also creates a style node in which to put the style declaration
  //TODO: would it be simpler to just set the style of the body, rather than doing these DOM manipulations?
  if (!(s5ss = $('s5ss'))) {
    if (!document.createStyleSheet) {
      getElementsByTagAndClassName('head')[0].appendChild(s5ss = document.createElement('style'));
      s5ss.setAttribute('media','screen, projection');
      s5ss.setAttribute('id','s5ss');
    } else {
      document.createStyleSheet();
      document.s5ss = document.styleSheets[document.styleSheets.length - 1];
    }
  }
  if (!(document.s5ss && document.s5ss.addRule)) {
    while (s5ss.lastChild) s5ss.removeChild(s5ss.lastChild);
    s5ss.appendChild(document.createTextNode('html {font-size: ' + value + ' !important;}'));
  } else {
    document.s5ss.addRule('html','font-size: ' + value + ' !important;');
  }
}

S5.prototype.notOperaFix = function() {
  //TODO: dunno
  slideCSS = $('slideProj').href;
  var slides = $('slideProj');
  var outline = $('outlineStyle');
  slides.setAttribute('media','screen');
  outline.disabled = true;
  if (this.isGe) {
    slides.setAttribute('href','null');   // Gecko fix
    slides.setAttribute('href',slideCSS); // Gecko fix
  }
  if (this.isIE && document.styleSheets && document.styleSheets[0]) {
    document.styleSheets[0].addRule('img', 'behavior: url(ui/default/iepngfix.htc)');
    document.styleSheets[0].addRule('div', 'behavior: url(ui/default/iepngfix.htc)');
    document.styleSheets[0].addRule('.slide', 'behavior: url(ui/default/iepngfix.htc)');
  }
}

S5.prototype.getIncrementals = function(obj) {
  //walk the DOM for a given slide, returning the objects which can be built incrementally
  // this method also changes the DOM to take advantage of some shortcuts
  // TODO: I'm afraid this might be a bit expensive and wasteful
  var incrementals = new Array();
  if (!obj) 
    return incrementals;
  var children = obj.childNodes;
  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    if (child.className && hasElementClass(child, 'incremental')) { // workaround MochiKit bug
      // for lists, we want to propagate the incremental down to the list items
      if (child.nodeName == 'OL' || child.nodeName == 'UL') {
        removeElementClass(child, 'incremental');
        for (var j = 0; j < child.childNodes.length; j++) {
          if (child.childNodes[j].nodeType == 1) {
            addElementClass(child.childNodes[j], 'incremental');
          }
        }
      } else {
        incrementals[incrementals.length] = child;
        removeElementClass(child,'incremental');
      }
    }
    if (child.className && hasElementClass(child, 'show-first')) {
      if (child.nodeName == 'OL' || child.nodeName == 'UL') {
        removeElementClass(child, 'show-first');
        if (child.childNodes[this.isGe].nodeType == 1) {
          removeElementClass(child.childNodes[this.isGe], 'incremental');
        }
      } else {
        incrementals[incrementals.length] = child;
      }
    }
    incrementals = incrementals.concat(this.getIncrementals(child));
  }
  return incrementals;
}

S5.prototype.createIncrementals = function() {
  var incrementals = new Array();
  for (var i = 0; i < this.smax; i++) {
    incrementals[i] = this.getIncrementals($('slide' + i));
  }
  return incrementals;
}

S5.prototype.defaultCheck = function() {
  //pulls a view values from meta elements into global variables
  var allMetas = getElementsByTagAndClassName('meta');
  for (var i = 0, l = allMetas.length; i < l; i++) {
    if (allMetas[i].name == 'defaultView') {
      this.defaultView = allMetas[i].content;
    }
    if (allMetas[i].name == 'controlVis') {
      this.controlVis = allMetas[i].content;
    }
  }
}

// Key trap fix, new function body for trap()
S5.prototype.trap = function(e) {
  //TODO: sort this out
  if (!e) {
    e = event;
    e.which = e.keyCode;
  }
  try {
    modifierKey = e.ctrlKey || e.altKey || e.metaKey;
  }
  catch(e) {
    modifierKey = false;
  }
  return modifierKey || e.which == 0;
}

S5.prototype.noteLabel = function() { 
  // Gives notes id's to match parent slides
  var notes = getElementsByTagAndClassName('div','notes');
  for (var i = 0; i < notes.length; i++) {
    var note = notes[i];
    var id = 'note' + note.parentNode.id.substring(5); //assumes that there's no levels between the slide and the notes
    note.setAttribute('id', id);
  }
  this.resetElapsedSlide(); // TODO: odd place for these, probably need to be refactored out
  this.resetRemainingTime();
  window.setInterval('S5.prototype.updateElaspedTime()', 1000);
}

S5.prototype.createNotesWindow = function() { 
  // creates a window for our notes
  if (!this.s5NotesWindow || this.s5NotesWindow.closed) { // Create the window if it doesn't exist
    this.s5NotesWindowLoaded = false;
    // Note: Safari has a tendency to ignore window options preferring to default to the settings of the parent window, grr.
    this.s5NotesWindow = window.open('ui/s5-notes.html', 'this.s5NotesWindow', 'top=0,left=0');
  }
  while(!this.s5NotesWindow || !this.s5NotesWindow.document) {
    wait(1000);
  }
  this.loadNotes();
}

S5.prototype.loadNotes = function() {
  log(this.snum);
  // Loads a note into the note window
  var notes = nextNotes = '<em class="disclaimer">There are no notes for this slide.</em>';
  if ($('note' + this.snum.toString())) {
    notes = $('note' + this.snum.toString()).innerHTML;
  }
  if ($('note' + (this.snum + 1))) {
    nextNotes = $('note' + (this.snum + 1)).innerHTML;
  }

  //I've removed the slide titles from the notes (since we now have the entire slides, w/ titles) --ryan
//  var jl = $('jumplist');
//  var slideTitle = jl.options[jl.selectedIndex].text.replace(/^\d+\s+:\s+/, '') + ((jl.selectedIndex) ? ' (' + jl.selectedIndex + '/' + (smax - 1) + ')' : '');
//  if (incrementals[snum].length > 0) {
//    slideTitle += ' <small>[' + incpos + '/' + incrementals[snum].length + ']</small>';
//  }
//  if (jl.selectedIndex < smax - 1) {
//    var nextTitle = jl.options[jl.selectedIndex + 1].text.replace(/^\d+\s+:\s+/, '') + ((jl.selectedIndex + 1) ? ' (' + (jl.selectedIndex + 1) + '/' + (smax - 1) + ')' : '');
//  } else {
//    var nextTitle = '[end of slide show]';
//  }

  if (this.s5NotesWindow && !this.s5NotesWindow.closed && this.s5NotesWindow.document) {
    this.s5NotesWindow.document.getElementById('current-notes').innerHTML = notes;
    this.s5NotesWindow.document.getElementById('next-notes').innerHTML = nextNotes;
    this.s5NotesWindow.document.getElementById('current-slide').innerHTML = $('slide' + this.snum).innerHTML
    this.s5NotesWindow.document.getElementById('next-slide').innerHTML = $('slide' + (this.snum + 1)).innerHTML
  }
  this.resetElapsedSlide();
}

S5.prototype.minimizeTimer = function(id) {
  //minimizes the time specified by `id`
  //TODO: this seems to be a general purpose item, perhaps it should be renamed?
  var obj = this.s5NotesWindow.document.getElementById(id);
  if (hasElementClass(obj, 'collapsed')) {
    removeElementClass(obj, 'collapsed');
  } else {
    addElementClass(obj, 'collapsed');
  }
}

S5.prototype.resetElapsedTime = function() {
  this.presentationStart = new Date();
  slideStart = new Date();
  updateElaspedTime();
}

S5.prototype.resetElapsedSlide = function() {
  if (this.snum != this.previousSlide) {
    this.slideStart = new Date();
    this.previousSlide = this.snum;
    this.updateElaspedTime();
  }
}

S5.prototype.updateElaspedTime = function() {
  if (!this.s5NotesWindowLoaded || !this.s5NotesWindow || this.s5NotesWindow.closed) return;
  var now = new Date();
  var ep = this.s5NotesWindow.document.getElementById('elapsed-presentation');
  var es = this.s5NotesWindow.document.getElementById('elapsed-slide');
  ep.innerHTML = this.formatTime(now.valueOf() - this.presentationStart.valueOf());
  es.innerHTML = this.formatTime(now.valueOf() - this.slideStart.valueOf());
}

S5.prototype.resetRemainingTime = function() {
  if (!this.s5NotesWindowLoaded || !this.s5NotesWindow || this.s5NotesWindow.closed) return;
  var startField = this.s5NotesWindow.document.getElementById('startFrom');
  var startFrom = readTime(startField.value);
  this.countdown.remaining = startFrom * 60000;  // convert to msecs
  this.countdown.start = new Date().valueOf();
  this.countdown.end = this.countdown.start + this.countdown.remaining;
  var tl = this.s5NotesWindow.document.getElementById('timeLeft');
  var timeLeft = this.formatTime(countdown.remaining);
  tl.innerHTML = timeLeft;
}

S5.prototype.updateRemainingTime = function() {
  if (!this.s5NotesWindowLoaded || !this.s5NotesWindow || this.s5NotesWindow.closed) return;
  var tl = this.s5NotesWindow.document.getElementById('timeLeft');
  var now = new Date();
  if (countdown.state == 'run') {
    countdown.remaining = countdown.end - now;
  }
  tl.style.color = '';
  tl.style.backgroundColor = '';
  if (countdown.remaining >= 0) {
    var timeLeft = this.formatTime(countdown.remaining);
    removeElementClass(tl,'overtime');
    if (countdown.remaining < 300000) {
      tl.style.color = 'rgb(' + (255-Math.round(countdown.remaining/2000)) + ',0,0)';
      tl.style.backgroundColor = 'rgb(255,255,' + (Math.round(countdown.remaining/2000)) + ')';
    }
  } else {
    var timeLeft = '-' + this.formatTime(-countdown.remaining);
    addElementClass(tl,'overtime');
  }
  tl.innerHTML = timeLeft;
}

S5.prototype.toggleRemainingTime = function() {
  if (countdown.state == 'pause') countdown.state = 'run'; else countdown.state = 'pause';
  if (countdown.state == 'pause') {
    window.clearInterval(countdown.timer);
  }
  if (countdown.state == 'run') {
    countdown.start = new Date().valueOf();
    countdown.end = countdown.start + countdown.remaining;
    countdown.timer = window.setInterval('updateRemainingTime()', 1000);
  }
}

S5.prototype.alterRemainingTime = function(amt) {
  //takes an integer, `amt` and then updates the remaining time in the other window
  var change = amt * 60000;  // convert to msecs
  countdown.end += change;
  countdown.remaining += change;
  updateRemainingTime();
}

S5.prototype.formatTime = function(msecs) {
  //takes an integer representing milliseconds and formats a time in the form HH:MM:SS
  var time = new Date(msecs);

  var hrs = time.getUTCHours() + ((time.getUTCDate() -1) * 24); // I doubt anyone will spend more than 24 hours on a presentation or single slide but just in case...
  hrs = (hrs < 10) ? '0'+hrs : hrs;
  if (hrs == 'NaN' || isNaN(hrs)) hrs = '--';

  var min = time.getUTCMinutes();
  min = (min < 10) ? '0'+min : min;
  if (min == 'NaN' || isNaN(min)) min = '--';

  var sec = time.getUTCSeconds();
  sec = (sec < 10) ? '0'+sec : sec;
  if (sec == 'NaN' || isNaN(sec)) sec = '--';

  return hrs + ':' + min + ':' + sec;
}

S5.prototype.readTime = function(val) {
  //takes a time in the form HH:MM::SS and converts it to an integer. If not in this form, 
  var sregex = /:/;
  var matches = sregex.exec(val); // TODO: this may be collapsible into one line
  if (matches == null) {
    return val;
  } else {
    var times = val.split(':');
    var hours = parseInt(times[0]);
    var mins = parseInt(times[1]);
    var total = (hours * 60) + mins;
    return total;
  }
}

S5.prototype.windowChange = function() {
  //executes functions needed when the window changes size
  wait(5);
  this.fontScale();
}

S5.prototype.loadSlides = function() {
  this.slides = getElementsByTagAndClassName('*', 'slide');
}

S5.prototype.startup = function() {
  this.defaultCheck();
  this.createControls();  // hallvord
  this.loadSlides();
  this.slideLabel();
  this.incrementals = this.createIncrementals();
  this.noteLabel(); // [SI:060104] must follow slideLabel()
  this.loadNotes();
  this.fixLinks();
  this.externalLinks();
  this.fontScale();
  if (!this.isOp) this.notOperaFix();
  this.slideJump();
  if (this.defaultView == 'outline') {
    toggle();
  }
  connect(document, 'onkeyup', this, 'keys');
  connect(document, 'onkeypress', this, 'trap');
  connect(document, 'onclick', this, 'clicker');
  connect(window, 'onresize', this, 'windowChange');
}

s = new S5()
connect(window, 'onload', s, 'startup');