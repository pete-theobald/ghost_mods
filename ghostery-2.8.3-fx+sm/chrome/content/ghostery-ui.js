/**
 * Ghostery Firefox Extension: http://www.ghostery.com/
 *
 * Copyright (C) 2008-2009 David Cancel
 * Copyright (C) 2009-2012 Evidon, Inc.
 * @author Felix Shnir
 * @author David Cancel
 * @copyright Copyright (C) 2008-2009 David Cancel <dcancel@dcancel.com>
 * @copyright Copyright (C) 2009-2012 Evidon, Inc.
 */
if( !ghostery ) { var ghostery = {}; }  // If Ghostery is not already loaded, define it and set current preferences state.

ghostery.ui = {
	/* Functions to deal with property files */
	getBundle: function() {
		return document.getElementById( "ghostery-strings" );
	},

	// Access our resource bundle
	getString: function( key ) {
		var bundle = this.getBundle();
		var text = bundle.getString( key );
		if( text ) return text;

		return key;
	},

	getFormattedString: function( key, argv ) {
		var bundle = this.getBundle();
		return bundle.getFormattedString( key, argv );
	},

	/* Functions to build dynamic menu */
	removeChildren: function(container) {
		var children = container.childNodes;
		for( var i = children.length - 1; i >= 0; i-- ) {
			var node = children[i];
			container.removeChild(node);
		}
	},

	addMenuItem: function(popup, callback, label, value, img) {
		var item = document.createElement("menuitem");
		item.setAttribute("label", label);
		item.setAttribute("class", "menu-item");
		if ( value ) item.setAttribute("value", value);

		item.addEventListener( "command", callback, false );

		if ( img ) { 
			item.setAttribute("image", img);
			item.setAttribute("class", "menuitem-iconic");
		} else {
			item.setAttribute("class", "ident");
		}
		popup.appendChild(item);

		return item;
	},

	// Add Popup header with Ghostery Icon
	addMenuHeader: function(menu, label) {
		var item = document.createElement("toolbarbutton");
		item.setAttribute("label", label );
		item.setAttribute("class", "menu-header");
		item.setAttribute("image","chrome://ghostery/content/ghostery-16x16.png");
		menu.appendChild(item);
		return item;    
	},

	// Build Script Menu
	buildScriptMenu: function(menu, bugInfo, insertBefore) {
		var bug = bugInfo.bug;
		var script = bugInfo.script;
		var submenu = document.createElement("menu");
		submenu.setAttribute("label", script );
		submenu.setAttribute("tooltiptext", script);
		submenu.setAttribute("class", "script-url-item");

		if (!insertBefore) {
			menu.appendChild(submenu);
		} else {
			var markedSeparator = document.getElementById('ghostery-submenu-separator-' + bug.aid);	
			menu.insertBefore(submenu, markedSeparator);
		}

		var popup = document.createElement("menupopup");
		popup.setAttribute("class", "webbug-popup ");

		submenu.appendChild(popup);

		var item = document.createElement("menuitem");
		item.setAttribute("label", "View Script Source");
		item.setAttribute("value", script);

		item.addEventListener( "command", function() { ghostery.ui.showScriptSource(bug.name, script) }, false );

		popup.appendChild(item);
	},

	// Build Bug Menu and sub menu
	buildBugMenu: function(popup, bugInfo, isWhitelisted) {
		var bug = bugInfo.bug;
		var p = ghostery.prefs;

		try {
			var bugEl = document.getElementById('ghostery-menu-' + bug.aid);
			if (bugEl) {
				var bugSub = document.getElementById('ghostery-submenu-' + bug.aid);
				this.buildScriptMenu(bugSub, bugInfo, true);

				return;
			}
		} catch (e) {}

		var bugmenu = document.createElement("menu");
		bugmenu.setAttribute("id", 'ghostery-menu-' + bug.aid);
		bugmenu.setAttribute("label", bug.name);

		try { var host = (gBrowser.selectedBrowser.contentDocument.location.host ? gBrowser.selectedBrowser.contentDocument.location.host : gBrowser.selectedBrowser.contentDocument.location); } catch (e) {}

		var userSiteSelections = ghostery.prefs.getWhitelistedDatabase(host);

		if (!isWhitelisted && p.shouldBlockBug(bug.aid, userSiteSelections)) {
			bugmenu.setAttribute("class", "blocked-bug");
		}

		popup.appendChild(bugmenu);

		var subpop = document.createElement("menupopup");
		subpop.setAttribute("id", 'ghostery-submenu-' + bug.aid);
		subpop.setAttribute("class", "webbug-popup ");
		bugmenu.appendChild(subpop);

		var item = document.createElement("menuitem");
		if ( !bug.userCreated ) {
			var label = this.getFormattedString( "menu.whatis", [ bug.name ] );
			item.setAttribute("label", label);
			item.setAttribute("value", bug.name );
			item.addEventListener( "command", function() { ghostery.ui.showBugDirectory(this.value) }, false );

			item.setAttribute("class", "menu-bug-whatis");
		} else {
			var label = this.getFormattedString( "menu.usersupplied", [ bug.name ] );
			item.setAttribute("label", label);
			item.setAttribute("value", bug.name);
			item.setAttribute("class", "menu-bug-whatis");
		}
		subpop.appendChild(item);

		// Add Script submenu
		subpop.appendChild(document.createElement("menuseparator"));
		this.buildScriptMenu(subpop, bugInfo);

		// Add Blocking submenu
		var markedSeparator = document.createElement("menuseparator");
		markedSeparator.setAttribute('id', 'ghostery-submenu-separator-' + bug.aid);
		subpop.appendChild(markedSeparator);

		item = document.createElement("menuitem");
		item.setAttribute("type", "checkbox");
		item.setAttribute("name", "block" + bug.aid);
		item.setAttribute("value", bug.aid);
		item.setAttribute("checked", "" + p.isSelectedAppId(bug.aid));
		item.setAttribute("label", this.getFormattedString("menu.blocking.block", [bug.name]));

		if (p.isSelectedAppId(bug.aid)) { item.setAttribute("class", "bug-icon-block"); }
		item.addEventListener( "command", function() { ghostery.ui.checkBlocking(this.value); }, false );

		subpop.appendChild(item);
	},

	checkBlocking: function(bugId) {
		try {
			var p = ghostery.prefs;

			p.toggleSelectedBug(bugId);
			p.togglePause(true);
		} catch (e) { }
	},

	mainPopupControl: function(c) {
		var popup = document.getElementById('ghostery-popup');

		if ( (c === 's') && (popup.state == 'showing') ) {
			ghostery.ui.getMenuPopup();
		}
	},

	getMenuPopup: function() {
		var popup = document.getElementById("ghostery-popup");

		this.removeChildren(popup);

		var site = '';

		try {
			site = ( gBrowser.selectedBrowser.contentDocument.location.host ? gBrowser.selectedBrowser.contentDocument.location.host : gBrowser.selectedBrowser.contentDocument.location ).toString().toLowerCase();
		} catch (e) {}

		var isWhitelisted = ghostery.prefs.isWhiteListed(site);

		// Show bugs found as top menu
		try {
			// rearranging the array to be by aid
			var bugs = ghostery.currentBugs;

			// if bugs were found generate dynamic list
			if (bugs && bugs.length > 0) {
				// Add Title since web bugs were found
				this.addMenuHeader(popup, this.getString("menu.bugsfound"));

				for(var i = 0; i < bugs.length; i++) {
					this.buildBugMenu(popup, bugs[i], isWhitelisted);                
				}

				popup.appendChild(document.createElement("menuseparator"));
			} else {
				this.addMenuHeader(popup, this.getString("statusbar.nothing_found_label"));
			}
		} catch (e) { }

		// add static footer options
		this.getMenuFooter(popup, isWhitelisted);
	},

	// Include static menu items
	getMenuFooter: function(popup, isWhitelisted) {
		var dis = document.createElement("menuitem");
		dis.setAttribute("type", "checkbox");
		dis.setAttribute("value", 0);
		dis.setAttribute("checked", ghostery.prefs.paused);
		dis.setAttribute("label", ( ghostery.prefs.paused ? this.getString("menu.resume") : this.getString("menu.pause") ) );

		if (ghostery.prefs.paused) {
			dis.setAttribute("class", "bug-icon-block");
		}

		dis.addEventListener( "command", function() { ghostery.prefs.togglePause(); }, false );
		popup.appendChild(dis);

		var item = document.createElement("menuitem");
		item.setAttribute("type", "checkbox");
		item.setAttribute("value", 0);
		item.setAttribute("checked", "" + isWhitelisted);
		item.setAttribute("label", this.getString("menu.whitelist_site") );

		if (isWhitelisted) {
			item.setAttribute("class", "bug-icon-block");
			item.addEventListener( "command", function() { ghostery.prefs.deWhitelistCurrentSite(); }, false );
		} else {
			item.addEventListener( "command", function() { ghostery.prefs.whitelistCurrentSite(); }, false );
		}

		popup.appendChild(item);

		this.addMenuItem(popup, function() { ghostery.ui.openBrowserTab(this.value) }, this.getString("menu.help"), 'help/firefox');
		this.addMenuItem(popup, function() { ghostery.ui.showOptionsDialog() }, this.getString("menu.options"), 'options');
		popup.appendChild( document.createElement("menuseparator"));
		this.addMenuItem(popup, function() { ghostery.ui.openBrowserTab(this.value) }, this.getString("menu.share"), 'share');
		popup.appendChild(document.createElement("menuseparator"));
		this.addMenuItem(popup, function() { ghostery.db.updateDatabase(true) }, this.getString("menu.list_update"), 'remote/update');
		this.addMenuItem(popup, function() { ghostery.ui.openBrowserTab(this.value) }, this.getString("menu.feedback"), 'feedback');
		this.addMenuItem(popup, function() { ghostery.ui.showAboutDialog() }, this.getString("menu.about"), 'about');
	},

	showBlockLogDialog: function() {
		window.openDialog('chrome://ghostery/content/block.xul', 'ghostery-about-dialog', 'centerscreen,chrome,modal');
	},

	showAboutDialog: function() {
		window.openDialog('chrome://ghostery/content/about.xul', 'ghostery-about-dialog', 'centerscreen,chrome,modal');
	},

	showOptionsDialog: function() {
		gBrowser.selectedTab = gBrowser.addTab('chrome://ghostery/content/options.html');
	},

	showScriptSource: function(bug_name, script_url) {
		bug_name = encodeURIComponent(window.btoa(bug_name));
		script_url = encodeURIComponent(window.btoa(script_url));
		var url = 'http://www.ghostery.com/gcache/?n=' + bug_name + '&s=' + script_url;
		gBrowser.selectedTab = gBrowser.addTab(url);
	},

	showBugDirectory: function(bug) {
		bug = bug.replace(/\s+/g, "_");
		bug = bug.toLowerCase();
		var path = 'apps/' + encodeURIComponent(bug);
		this.openBrowserTab(path);
	},

	openBrowserTab2: function( url ) {
		url = 'http://' + url + '.ghostery.com/'
		gBrowser.selectedTab = gBrowser.addTab(url);
	},

	openBrowserTab: function( url ) {
		url = ghostery.prefs.siteURL + url;
		gBrowser.selectedTab = gBrowser.addTab(url);
	},

	openWalkthrough: function() {
		gBrowser.selectedTab = gBrowser.addTab('chrome://ghostery/content/wizard.html');
	},
	panelOneTimeStuff: true,
	panelFrame: null,
	showPanel: function(e) {
		if (!ghostery.prefs.panelNew) {
			return;
		}

		var panel = document.getElementById('ghostery-panel');

		if (!panel) {
			panel = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'panel');
			panel.setAttribute('type', 'arrow');
			panel.setAttribute('id', 'ghostery-panel');

			let css = '.panel-inner-arrowcontent, .panel-arrowcontent {padding: 0;}';
			let originalXBL = 'chrome://global/content/bindings/popup.xml#arrowpanel';
			let binding = 
				'<bindings xmlns="http://www.mozilla.org/xbl">' +
					'<binding id="id" extends="' + originalXBL + '">' + 
						'<resources>' + 
							'<stylesheet src="data:text/css,' + 
							document.defaultView.encodeURIComponent(css) + '"/>' +
						'</resources>' +
					'</binding>' +
				'</bindings>';
			panel.style.MozBinding = 'url("data:text/xml,' + document.defaultView.encodeURIComponent(binding) + '")';
			panel.style.border = '0px';

			let frame = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", 'iframe');
//			frame.setAttribute('type', 'content');
			frame.setAttribute('flex', '1');
			frame.setAttribute('transparent', 'transparent');
			frame.setAttribute('src', 'chrome://ghostery/content/popup.html'); 
			frame.setAttribute('id', 'ghostery-panel-frame');
			frame.style.border = '0px';

			panel.appendChild(frame);
			document.getElementById("mainPopupSet").appendChild(panel);

			panel.firstChild.style.height = 150 + "px";
		}

		panel.style.width = 306 + 'px';

		function waitForBinding() {
			if (!panel.openPopup) {
				setTimeout(function() {waitForBinding();}, 50);
				return;
			}

			ghostery.ui.displayApps();
			if (e) {
				panel.openPopup( document.getElementById('ghostery-status') , 'before_start' , 0 , 0 , true, true, null );
			} else {
				panel.openPopup( document.getElementById('ghostery-toolbar-button') , 'before_start' , 0 , 0 , true, true, null );
			}
			ghostery.ui.adjustWidth(panel);

			ghostery.ui.panelFrame = document.getElementById('ghostery-panel-frame').contentWindow.document;
			panel.firstChild.style.height = ( ghostery.ui.panelFrame.body.offsetHeight + 10) + "px";

			if (ghostery.ui.panelOneTimeStuff) {
				ghostery.ui.panelFrame.getElementById('ghostery-pause-link').addEventListener('click', ghostery.ui.togglePauseButton, true);

				ghostery.ui.panelFrame.getElementById('ghostery-options-link').addEventListener('click', function() { ghostery.ui.showOptionsDialog(); panel.hidePopup(); }, true);
				ghostery.ui.panelFrame.getElementById('ghostery-feedback-link').addEventListener('click', function() { gBrowser.selectedTab = gBrowser.addTab('http://www.ghostery.com/feedback'); panel.hidePopup(); }, true);
				ghostery.ui.panelFrame.getElementById('ghostery-help-link').addEventListener('click', function() { gBrowser.selectedTab = gBrowser.addTab('http://www.ghostery.com/help/firefox'); panel.hidePopup(); }, true);
				ghostery.ui.panelFrame.getElementById('ghostery-share-link').addEventListener('click', function() { gBrowser.selectedTab = gBrowser.addTab('http://www.ghostery.com/share'); panel.hidePopup(); }, true);

				ghostery.prefs.arrayForEach(['ghostery-pause-link', 'ghostery-options-link', 'ghostery-feedback-link', 'ghostery-help-link', 'ghostery-share-link'], 
					function(a) {
						ghostery.ui.panelFrame.getElementById(a).addEventListener('mouseout', function() { ghostery.ui.hideTooltip(); }, true);
					});

				ghostery.ui.panelOneTimeStuff = false;

				ghostery.ui.panelFrame.getElementById('whitelist-site-link').addEventListener('click', function (e) {
					var site = '';				

					try {
						site = ( gBrowser.selectedBrowser.contentDocument.location.host ? gBrowser.selectedBrowser.contentDocument.location.host : gBrowser.selectedBrowser.contentDocument.location ).toString().toLowerCase();
					} catch (e) {}

					var isWhitelisted = ghostery.prefs.isWhiteListed(site);

					if (!isWhitelisted) {
						ghostery.prefs.whitelistCurrentSite();
						isWhitelisted = true;
					} else {
						ghostery.prefs.deWhitelistCurrentSite();
						isWhitelisted = false;
					}

					ghostery.ui.panelFrame.getElementById('whitelist-site-link').textContent = (isWhitelisted ? "Start Blocking on " : "Don't Block on ") 
					 + ghostery.ui.ellipsize(site, 21);

					ghostery.resetBadgeColor();

					e.preventDefault();
				});
			}
			// hides popup when a link is clicked
			let a = ghostery.ui.panelFrame.getElementById('apps-div').querySelectorAll('a');
			ghostery.prefs.arrayForEach(a, 
				function(a) {
					a.addEventListener('click', function() {
						panel.hidePopup();
				}, 
				true);
			});
		}
		waitForBinding();
	},
	
	// adjusts popup width depending on OS to avoid sizing issues.
	adjustWidth: function(panel) {
		var panelWidth = parseInt(getComputedStyle(panel).getPropertyValue('width'), 10);
		if (ghostery.cleaner.SystemHelper.isWindows()) { // windows
			if (panelWidth < 290) {
				panel.style.width = 330 + 'px';
			} 
			else if (panelWidth < 306) {
				panel.style.width = 316 + 'px';
			}
		}
		else if (ghostery.cleaner.SystemHelper.isLinux()) { // linux
			if (panelWidth < 290) {
				panel.style.width = 330 + 'px';
			} 
			else if (panelWidth < 306) {
				panel.style.width = 316 + 'px';
			}
		}
		else { // mac
			if (panelWidth < 295) {
				panel.style.width = 333 + 'px';
			}
			else if (panelWidth < 306) {
				panel.style.width = 313 + 'px';
			}
		}
	},

	togglePauseButton: function() {
		var b = ghostery.ui.panelFrame.getElementById('ghostery-pause-link').firstChild;

		if (ghostery.prefs.paused) {
			ghostery.prefs.togglePause();
			b.src = "images/popup/pause.png";
		} else {
			ghostery.prefs.togglePause();
			b.src = "images/popup/play.png";
		}

		ghostery.resetBadgeColor();
	},

	displayApps: function() {
		var site = '';

		try {
			site = ( gBrowser.selectedBrowser.contentDocument.location.host ? gBrowser.selectedBrowser.contentDocument.location.host : gBrowser.selectedBrowser.contentDocument.location ).toString().toLowerCase();
		} catch (e) {}

		var i, j,
			p = ghostery.prefs,
			isWhitelisted = p.isWhiteListed(site),
			bugs = ghostery.currentBugs,
			doc = document.getElementById('ghostery-panel-frame').contentWindow.document,
			num_apps = (bugs ? bugs.length : 0),
			apps_div = doc.getElementById('apps-div'),
			app_list_div,
			header = doc.createElement('div'),
			header_icon = doc.createElement('img'),
			userSiteSelections = ghostery.prefs.getWhitelistedDatabase(site);

		// Trim the list and realign the script sources
		var temp = [], previous = '';
		for (i = 0; i < num_apps; i++) {
			if (previous != bugs[i].bug.aid) {
				previous = bugs[i].bug.aid;
				bugs[i].sources = [];
				bugs[i].sources.push(bugs[i].script);

				temp.push(bugs[i]);
			} else {
				var b = temp.pop();
				b.sources.push(bugs[i].script);

				temp.push(b);
			}
		}

		var b = doc.getElementById('ghostery-pause-link').firstChild;

		if (ghostery.prefs.paused) {
			b.src = "images/popup/play.png";
		} else {
			b.src = "images/popup/pause.png";
		}

		doc.getElementById('edit-blocking-link').style.display = 'block';
		doc.getElementById('whitelist-site-link').style.display = 'none';
		doc.getElementById('blocking-options-div').style.display = 'none';

		bugs = temp;
		num_apps = (bugs ? bugs.length : 0),

		header_icon.src = 'images/popup/ghosty-top.png';
		header.appendChild(header_icon);
		header.id = 'header';

		// clean out apps_div
		while(apps_div.firstChild) {
			apps_div.removeChild(apps_div.firstChild);
		}

		if (num_apps == 0) {
			header.appendChild(doc.createTextNode( "No bugs found!" ));
			apps_div.appendChild(header);
			doc.getElementById('blocking-options-div').style.display = 'none';
			return;
		}

		for (i = 0; i < num_apps; i++) {
			if (i == 0) {
				header.appendChild(doc.createTextNode('Ghostery found'));
				header.appendChild(doc.createElement('br'));
				header.appendChild(doc.createTextNode('the following:'));
				header.className = 'border-bottom-gray';
				apps_div.appendChild(header);
				app_list_div = doc.createElement('div');
				app_list_div.id = 'app-list-div';
			}

			var app_div = doc.createElement('div');
			app_div.className = 'app-div';

			var app_name_div = doc.createElement('div');
			app_name_div.className = 'ellipsis';

			if (p.blockingMode !== p.blockNone) {
				var check = ghostery.ui.createCheckbox(doc, 'app-' + bugs[i].bug.aid, p.shouldBlockBug(bugs[i].bug.aid), 'app-checkbox');
				check.addEventListener('click', function (e) {
					// this prevents label from toggling the checkbox when clicked
					if (this.style.display != 'inline') {
						e.preventDefault();
						return;
					}

					var aid = this.id.substring(4);
					this.checked = (this.checked) ? ghostery.prefs.selectBug(aid) : !ghostery.prefs.deselectBug(aid);
				}, true);
				app_name_div.appendChild(check);
			}

			var app_link_span = doc.createElement('span');
			var classes = ['app-link-span', 'float-right'];
			if (p.showSources) {
				classes.push('bold');
			}

			if (!bugs[i].bug.userCreated) {
				app_link_span.className = classes.join(' ');
				app_link_span.appendChild(ghostery.ui.createLink(doc, 'http://www.ghostery.com/apps/' + encodeURIComponent(bugs[i].bug.name.replace(/\s+/g, '_').toLowerCase()), 'more info'));
				app_name_div.appendChild(app_link_span);
			}
	
			var app_name_span = doc.createElement('span'),
				app_name_label = doc.createElement('label');
			classes = ['app-name-span'];

			if (p.showSources) {
				classes.push('bold');
			}

			if (!isWhitelisted && p.shouldBlockBug(bugs[i].bug.aid, userSiteSelections)) {
				classes.push('blocked');
			} else if (isWhitelisted && p.shouldBlockBug(bugs[i].bug.aid, userSiteSelections)) {
				// no class currently, is one needed?
			} else {
				classes.push('whitelisted');
			}

			// green for unblocked

			app_name_span.className = classes.join(' ');
			app_name_span.appendChild(doc.createTextNode( ghostery.ui.ellipsize(bugs[i].bug.name, 35) ));
			app_name_span.title = bugs[i].bug.name;
			app_name_label.appendChild(app_name_span);
			app_name_label.id = 'app-' + bugs[i].bug.aid;
			app_name_label.setAttribute('for', 'app-' + bugs[i].bug.aid);

			app_name_div.appendChild(app_name_label);

			app_div.appendChild(app_name_div);

			if (p.showSources) {
				var app_sources_div = doc.createElement('div');
				app_sources_div.id = 'app-sources-for-' + bugs[i].bug.id;
				app_sources_div.className = 'app-sources-div ellipsis';

				for (j = 0; j < bugs[i].sources.length; j++) {
					app_sources_div.appendChild(ghostery.ui.createLink(doc, 'http://www.ghostery.com/gcache/?n=' + encodeURIComponent(window.btoa(bugs[i].bug.name)) + '&s=' + encodeURIComponent(window.btoa(bugs[i].sources[j])), ghostery.ui.ellipsize(bugs[i].sources[j], 50), ((!isWhitelisted && p.shouldBlockBug(bugs[i].bug.aid, userSiteSelections)) ? 'app-source-link blocked' : 'app-source-link'), bugs[i].sources[j] ));
					app_sources_div.appendChild(doc.createElement('br'));
				}
				app_div.appendChild(app_sources_div);
			}

			app_list_div.appendChild(app_div);
		}

		apps_div.appendChild(app_list_div);

		if (bugs && (p.blockingMode !== p.blockNone) ) {
			var _doc = doc;
			doc.getElementById('edit-blocking-link').addEventListener('click', function (e) {
				doc.getElementById('whitelist-site-link').textContent = (isWhitelisted ? "Start Blocking on " : "Don't Block on ") 
			  + ghostery.ui.ellipsize(site, 21);

				_doc.getElementById('edit-blocking-link').style.display = 'none';
				_doc.getElementById('whitelist-site-link').style.display = 'block';

				i = _doc.getElementsByClassName('app-link-span');
				for (j = 0; j < i.length; j++) {
					i[j].style.display = 'none';
				}

				i = _doc.getElementsByClassName('app-sources-div');
				for (j = 0; j < i.length; j++) {
					i[j].style.display = 'none';
				}

				i = _doc.getElementsByClassName('app-checkbox');
				for (j = 0; j < i.length; j++) {
					i[j].style.display = 'inline';
				}

				ghostery.ui.updatePopupHeight();

				e.preventDefault();
			});

			doc.getElementById('blocking-options-div').style.display = 'block';
		}
	},

	updatePopupHeight: function() {
		var panel = document.getElementById('ghostery-panel');
		panel.firstChild.style.height = ( ghostery.ui.panelFrame.body.offsetHeight + 10) + "px";
	},

	createCheckbox: function(doc, id, checked, class_name) {
		var check = doc.createElement('input');
		check.type = 'checkbox';
		if (checked != undefined) {
			check.checked = !!checked;
		}
		if (class_name) {
			check.className = class_name;
		}
		check.id = id;
		return check;
	},

	createLink: function(doc, href, text, class_name, title) {
		var link = doc.createElement('a');
		link.href = href;
		if (class_name) {
			link.className = class_name;
		}
		if (title) {
			link.title = title;
		}
		link.appendChild(doc.createTextNode(text));

		link.addEventListener('click', function (e) {
			gBrowser.selectedTab = gBrowser.addTab(href);
			e.preventDefault();
		});
		return link;
	},

	ellipsize: function(s, max_length) {
		return (s.length > max_length ? s.slice(0, max_length-3) + '...' : s);
	}
};