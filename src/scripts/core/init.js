require(["junior"],function(Jr) {
	window.setInterval((function(Jr){
		return function() {
			Jr.monitor();
		}
	})(Jr),200);
	$('a').live({
		click: function(Jr) {
			return function(e) {
				if ('aExceptions' in Jr) {
					for (var i in Jr.aExceptions) {
						if (Jr.aExceptions[i] == this) {
							return;
						}
					}
				}
				e.preventDefault();
				var uri = $(this).attr('href');
				if (uri && (uri.indexOf('.') == -1) && (uri.indexOf(':') == -1)) {
					Jr.goto(uri);
				} else {
					window.location = uri;
				}
			}
		}(Jr)
	});
});
